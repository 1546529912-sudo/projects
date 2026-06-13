<?php
declare(strict_types=1);

namespace app\service;

use think\facade\Db;

/**
 * WMS 出库流程服务
 *   - acceptPicking：接 OMS 拣货单 → 分配库位 + 写 outbound + items + tasks
 *   - autoComplete：一键完成（合并 pick/review/ship）+ 回传 OMS
 */
class OutboundService
{
    public function __construct(
        private InventoryService $inv = new InventoryService(),
    ) {}

    /**
     * @param array{
     *   outbound_no:string, oms_order_no:string,
     *   warehouse_code?:string,
     *   items: array<int,array{sku_code:string, qty:int}>,
     *   address: array,
     * } $input
     */
    public function acceptPicking(array $input, string $idempotencyKey): array
    {
        if (empty($input['outbound_no']) || empty($input['oms_order_no'])) {
            throw new \InvalidArgumentException('outbound_no / oms_order_no 必传');
        }
        if (empty($input['items'])) {
            throw new \InvalidArgumentException('items 不能为空');
        }
        // 幂等：已存在则直接返回
        $exist = Db::name('outbound_orders')
            ->where('idempotency_key', $idempotencyKey)
            ->whereOr('outbound_no', $input['outbound_no'])
            ->find();
        if ($exist) {
            return ['outbound_no' => $exist['outbound_no'], 'status' => $exist['status'], 'idempotent' => true];
        }

        $warehouse = $input['warehouse_code'] ?? 'WH-DEFAULT';

        // 预先分配库位（不在事务内，只是查询）
        $allocations = [];
        foreach ($input['items'] as $it) {
            $alloc = $this->inv->findAvailable($it['sku_code'], (int)$it['qty']);
            if (!$alloc) {
                throw new \RuntimeException("找不到可用库位: {$it['sku_code']} 需要 {$it['qty']}");
            }
            $allocations[] = [
                'sku_code' => $it['sku_code'],
                'qty' => (int)$it['qty'],
                'location_code' => $alloc['location_code'],
                'batch_no' => $alloc['batch_no'],
            ];
        }

        Db::startTrans();
        try {
            Db::name('outbound_orders')->insert([
                'outbound_no' => $input['outbound_no'],
                'oms_order_no' => $input['oms_order_no'],
                'warehouse_code' => $warehouse,
                'status' => 'allocated',
                'idempotency_key' => $idempotencyKey ?: null,
                'address' => json_encode($input['address'], JSON_UNESCAPED_UNICODE),
            ]);

            foreach ($allocations as $i => $a) {
                Db::name('outbound_items')->insert([
                    'outbound_no' => $input['outbound_no'],
                    'sku_code' => $a['sku_code'],
                    'qty' => $a['qty'],
                    'location_code' => $a['location_code'],
                    'batch_no' => $a['batch_no'],
                ]);
                Db::name('picking_tasks')->insert([
                    'outbound_no' => $input['outbound_no'],
                    'sku_code' => $a['sku_code'],
                    'location_code' => $a['location_code'],
                    'batch_no' => $a['batch_no'],
                    'expected_qty' => $a['qty'],
                    'sort' => $i + 1,
                ]);
                $this->inv->lock($a['sku_code'], $a['location_code'], $a['batch_no'], $a['qty']);
            }
            Db::commit();
        } catch (\Throwable $e) {
            Db::rollback();
            throw $e;
        }

        return ['outbound_no' => $input['outbound_no'], 'status' => 'allocated', 'idempotent' => false];
    }

    /**
     * 一键完成出库（替代 pick/review/ship 分阶段）：
     *   1. 拣货任务全部置 picked + 实物库存扣减
     *   2. 生成快递单号（mock）
     *   3. outbound_orders.status = shipped
     *   4. XADD wms.outbound.completed（OMS 异步消费）
     */
    public function autoComplete(string $outboundNo): array
    {
        $order = Db::name('outbound_orders')->where('outbound_no', $outboundNo)->find();
        if (!$order) throw new \RuntimeException("出库单不存在: {$outboundNo}");
        if ($order['status'] !== 'allocated') {
            throw new \RuntimeException("出库单状态不允许 auto-complete: " . $order['status']);
        }

        $items = Db::name('outbound_items')->where('outbound_no', $outboundNo)->select()->toArray();
        $tasks = Db::name('picking_tasks')->where('outbound_no', $outboundNo)->select()->toArray();
        $expressNo = 'SF' . date('YmdHis') . substr((string)mt_rand(1000, 9999), 0, 4);

        Db::startTrans();
        try {
            foreach ($tasks as $t) {
                Db::name('picking_tasks')->where('id', $t['id'])->update([
                    'picked_qty' => $t['expected_qty'],
                    'status' => 'picked',
                    'picked_at' => date('Y-m-d H:i:s'),
                ]);
            }
            foreach ($items as $i) {
                Db::name('outbound_items')->where('id', $i['id'])->update([
                    'picked_qty' => $i['qty'],
                ]);
                $this->inv->deduct($i['sku_code'], $i['location_code'], $i['batch_no'] ?? 'INIT', (int)$i['qty']);
            }
            Db::name('outbound_orders')->where('outbound_no', $outboundNo)->update([
                'status' => 'shipped',
                'express_company' => 'SF',
                'express_no' => $expressNo,
                'shipped_at' => date('Y-m-d H:i:s'),
            ]);
            Db::commit();
        } catch (\Throwable $e) {
            Db::rollback();
            throw $e;
        }

        // 推 wms.outbound.completed 给 OMS 消费（失败不影响 WMS shipped 状态）
        $omsItems = array_map(
            fn($it) => ['sku_code' => $it['sku_code'], 'qty' => (int)$it['qty']],
            $items
        );
        $publishOk = false;
        $publishErr = null;
        try {
            (new EventBus())->publish('wms.outbound.completed', [
                'order_no' => $order['oms_order_no'],
                'picking_no' => $outboundNo,
                'express_no' => $expressNo,
                'items' => $omsItems,
            ]);
            $publishOk = true;
        } catch (\Throwable $e) {
            $publishErr = $e->getMessage();
        }

        return [
            'outbound_no' => $outboundNo,
            'oms_order_no' => $order['oms_order_no'],
            'status' => 'shipped',
            'express_no' => $expressNo,
            'event_published' => $publishOk,
            'event_error' => $publishErr,
        ];
    }

    public function detail(string $outboundNo): array
    {
        $order = Db::name('outbound_orders')->where('outbound_no', $outboundNo)->find();
        if (!$order) throw new \RuntimeException("出库单不存在: {$outboundNo}");
        $items = Db::name('outbound_items')->where('outbound_no', $outboundNo)->select()->toArray();
        $tasks = Db::name('picking_tasks')->where('outbound_no', $outboundNo)->select()->toArray();
        $order['address'] = json_decode($order['address'] ?? '[]', true);
        return ['order' => $order, 'items' => $items, 'tasks' => $tasks];
    }

    public function listAll(int $page = 1, int $size = 20): array
    {
        $total = Db::name('outbound_orders')->count();
        $rows = Db::name('outbound_orders')->order('id', 'desc')->page($page, $size)->select()->toArray();
        foreach ($rows as &$r) {
            $r['address'] = json_decode($r['address'] ?? '[]', true);
        }
        return ['list' => $rows, 'total' => $total, 'page' => $page, 'size' => $size];
    }

    // callOmsShipped 已删除：改用 EventBus XADD wms.outbound.completed
}
