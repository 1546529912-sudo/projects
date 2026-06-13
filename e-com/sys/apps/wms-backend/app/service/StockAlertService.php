<?php
declare(strict_types=1);

namespace app\service;

use think\facade\Db;

/**
 * 低库存预警（iter-25）
 *
 *   规则：每 SKU 一行 threshold，enabled=1 时有效
 *   触发：SUM(quantity - locked_quantity) < threshold
 *   API:
 *     - listAlerts: 返回当前触发的告警列表
 *     - listRules:  返回规则列表
 *     - upsertRule: 新增/更新（按 sku_code UPSERT）
 *     - deleteRule: 删除规则
 */
class StockAlertService
{
    public function listRules(): array
    {
        return Db::name('stock_alert_rules')
            ->order('id', 'desc')
            ->select()->toArray();
    }

    public function upsertRule(array $data): array
    {
        $sku = trim((string)($data['sku_code'] ?? ''));
        if (!$sku) throw new \RuntimeException('sku_code 必传');
        $threshold = (int)($data['threshold'] ?? 0);
        if ($threshold < 0) throw new \RuntimeException('threshold 必须 ≥ 0');

        $existing = Db::name('stock_alert_rules')->where('sku_code', $sku)->find();
        $now = date('Y-m-d H:i:s');
        if ($existing) {
            $upd = [
                'threshold' => $threshold,
                'enabled' => isset($data['enabled']) ? (int)$data['enabled'] : (int)$existing['enabled'],
                'remark' => $data['remark'] ?? $existing['remark'],
            ];
            if (array_key_exists('notify_webhook_url', $data)) {
                $url = trim((string)$data['notify_webhook_url']);
                $upd['notify_webhook_url'] = $url === '' ? null : $url;
            }
            if (array_key_exists('notify_cooldown_minutes', $data)) {
                $upd['notify_cooldown_minutes'] = max(1, (int)$data['notify_cooldown_minutes']);
            }
            Db::name('stock_alert_rules')->where('id', $existing['id'])->update($upd);
            return Db::name('stock_alert_rules')->where('id', $existing['id'])->find();
        }
        $url = isset($data['notify_webhook_url']) ? trim((string)$data['notify_webhook_url']) : '';
        $id = Db::name('stock_alert_rules')->insertGetId([
            'sku_code' => $sku,
            'threshold' => $threshold,
            'enabled' => isset($data['enabled']) ? (int)$data['enabled'] : 1,
            'remark' => $data['remark'] ?? '',
            'notify_webhook_url' => $url === '' ? null : $url,
            'notify_cooldown_minutes' => isset($data['notify_cooldown_minutes']) ? max(1, (int)$data['notify_cooldown_minutes']) : 60,
            'created_by' => $data['created_by'] ?? 'system',
            'created_at' => $now,
        ]);
        return Db::name('stock_alert_rules')->where('id', $id)->find();
    }

    public function deleteRule(string $sku): void
    {
        Db::name('stock_alert_rules')->where('sku_code', $sku)->delete();
    }

    /**
     * 当前告警列表：遍历 enabled 规则，对比 WMS 总可用，<threshold 则进 alerts
     */
    public function listAlerts(): array
    {
        $rules = Db::name('stock_alert_rules')->where('enabled', 1)->select()->toArray();
        if (!$rules) return [];

        $skus = array_column($rules, 'sku_code');
        $stockRows = Db::name('inventory')
            ->whereIn('sku_code', $skus)
            ->where('status', 'normal')
            ->field('sku_code, SUM(quantity) AS total_qty, SUM(locked_quantity) AS total_locked')
            ->group('sku_code')
            ->select()->toArray();
        $stockMap = [];
        foreach ($stockRows as $r) {
            $stockMap[$r['sku_code']] = [
                'total_qty' => (int)$r['total_qty'],
                'total_locked' => (int)$r['total_locked'],
                'available' => (int)$r['total_qty'] - (int)$r['total_locked'],
            ];
        }

        $alerts = [];
        foreach ($rules as $rule) {
            $sku = $rule['sku_code'];
            $stat = $stockMap[$sku] ?? ['total_qty' => 0, 'total_locked' => 0, 'available' => 0];
            $threshold = (int)$rule['threshold'];
            if ($stat['available'] < $threshold) {
                $alerts[] = [
                    'sku_code' => $sku,
                    'threshold' => $threshold,
                    'available' => $stat['available'],
                    'total_qty' => $stat['total_qty'],
                    'total_locked' => $stat['total_locked'],
                    'gap' => $threshold - $stat['available'],
                    'remark' => $rule['remark'],
                ];
            }
        }
        return $alerts;
    }
}
