<?php
declare(strict_types=1);

namespace app\service;

use think\facade\Db;

/**
 * 拣货任务管理（iter-24 P1-1）
 *   补齐独立 API：list / detail / assign / scan / complete
 *
 *   状态机：pending → assigned（assigned_at + operator）→ partial → picked
 *   兼容 OutboundService 中已有 status='picked' 状态，本服务作为更细粒度入口。
 */
class PickingTaskService
{
    public function list(array $filter = [], int $page = 1, int $size = 20): array
    {
        $q = Db::name('picking_tasks');
        if (!empty($filter['status'])) $q->where('status', $filter['status']);
        if (!empty($filter['outbound_no'])) $q->whereLike('outbound_no', "%{$filter['outbound_no']}%");
        if (!empty($filter['operator'])) $q->where('operator', $filter['operator']);
        $total = $q->count();
        $rows = (clone $q)->order('id', 'desc')->page($page, $size)->select()->toArray();
        return ['total' => $total, 'page' => $page, 'size' => $size, 'list' => $rows];
    }

    public function detail(int $id): array
    {
        $row = Db::name('picking_tasks')->where('id', $id)->find();
        if (!$row) throw new \RuntimeException('拣货任务不存在');
        return $row;
    }

    public function assign(int $id, string $operator): array
    {
        $row = Db::name('picking_tasks')->where('id', $id)->find();
        if (!$row) throw new \RuntimeException('拣货任务不存在');
        if (in_array($row['status'], ['picked', 'cancelled'], true)) {
            throw new \RuntimeException('已完成或取消的任务不可分配');
        }
        Db::name('picking_tasks')->where('id', $id)->update([
            'operator' => $operator,
            'assigned_at' => date('Y-m-d H:i:s'),
            'status' => $row['status'] === 'pending' ? 'assigned' : $row['status'],
        ]);
        return $this->detail($id);
    }

    /**
     * 扫描上报 incrQty。增量加（不是设置）。
     */
    public function scan(int $id, int $incrQty, string $operator = ''): array
    {
        if ($incrQty <= 0) throw new \RuntimeException('扫描数量必须 > 0');
        return Db::transaction(function () use ($id, $incrQty, $operator) {
            $row = Db::name('picking_tasks')->where('id', $id)->lock(true)->find();
            if (!$row) throw new \RuntimeException('拣货任务不存在');
            if (in_array($row['status'], ['picked', 'cancelled'], true)) {
                throw new \RuntimeException('任务已结束');
            }
            $newPicked = (int)$row['picked_qty'] + $incrQty;
            if ($newPicked > (int)$row['expected_qty']) {
                throw new \RuntimeException("超量：当前 {$row['picked_qty']} + {$incrQty} > 期望 {$row['expected_qty']}");
            }
            $update = ['picked_qty' => $newPicked];
            if ($operator) $update['operator'] = $operator;
            // 状态自动流转
            if ($newPicked === (int)$row['expected_qty']) {
                $update['status'] = 'picked';
                $update['picked_at'] = date('Y-m-d H:i:s');
            } elseif ($row['status'] === 'pending' || $row['status'] === 'assigned') {
                $update['status'] = 'partial';
            }
            Db::name('picking_tasks')->where('id', $id)->update($update);
            return $this->detail($id);
        });
    }

    /**
     * 直接置 picked（picked_qty := expected_qty）。绕过逐次 scan
     */
    public function complete(int $id, string $operator = ''): array
    {
        $row = Db::name('picking_tasks')->where('id', $id)->find();
        if (!$row) throw new \RuntimeException('拣货任务不存在');
        if ($row['status'] === 'picked') return $row;
        if ($row['status'] === 'cancelled') throw new \RuntimeException('任务已取消');
        $update = [
            'picked_qty' => (int)$row['expected_qty'],
            'status' => 'picked',
            'picked_at' => date('Y-m-d H:i:s'),
        ];
        if ($operator) $update['operator'] = $operator;
        Db::name('picking_tasks')->where('id', $id)->update($update);
        return $this->detail($id);
    }
}
