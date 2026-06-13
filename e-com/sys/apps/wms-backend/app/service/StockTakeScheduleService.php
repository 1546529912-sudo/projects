<?php
declare(strict_types=1);

namespace app\service;

use think\facade\Db;

/**
 * 盘点定时调度（iter-32 B）
 *
 *   CRUD + tick() 由 command/StockTakeSchedule loop 调用
 */
class StockTakeScheduleService
{
    private const RETRIGGER_MIN_HOURS = 23;

    public function list(?bool $enabledOnly = null): array
    {
        $q = Db::name('stock_take_schedules')->whereNull('deleted_at')->order('id', 'desc');
        if ($enabledOnly !== null) $q->where('enabled', $enabledOnly ? 1 : 0);
        return $q->select()->toArray();
    }

    public function detail(int $id): ?array
    {
        $r = Db::name('stock_take_schedules')->where('id', $id)->whereNull('deleted_at')->find();
        return $r ?: null;
    }

    public function create(array $data): array
    {
        $this->validate($data);
        $id = Db::name('stock_take_schedules')->insertGetId([
            'name' => trim((string)$data['name']),
            'warehouse_code' => $data['warehouse_code'],
            'scope_type' => $data['scope_type'],
            'scope_value' => $data['scope_value'] ?? null,
            'schedule_type' => $data['schedule_type'],
            'hour' => (int)$data['hour'],
            'minute' => (int)$data['minute'],
            'days_of_week' => isset($data['days_of_week']) ? json_encode($data['days_of_week']) : null,
            'day_of_month' => $data['day_of_month'] ?? null,
            'enabled' => isset($data['enabled']) ? (int)$data['enabled'] : 1,
            'created_by' => $data['created_by'] ?? 'admin',
        ]);
        return $this->detail($id) ?? [];
    }

    public function update(int $id, array $data): array
    {
        $row = $this->detail($id);
        if (!$row) throw new \RuntimeException('调度不存在');
        $upd = [];
        foreach (['name', 'warehouse_code', 'scope_type', 'scope_value', 'schedule_type', 'hour', 'minute', 'day_of_month', 'enabled'] as $k) {
            if (array_key_exists($k, $data)) $upd[$k] = $data[$k];
        }
        if (array_key_exists('days_of_week', $data)) {
            $upd['days_of_week'] = $data['days_of_week'] === null ? null : json_encode($data['days_of_week']);
        }
        if ($upd) Db::name('stock_take_schedules')->where('id', $id)->update($upd);
        return $this->detail($id) ?? [];
    }

    public function delete(int $id): void
    {
        Db::name('stock_take_schedules')->where('id', $id)->update(['deleted_at' => date('Y-m-d H:i:s')]);
    }

    /**
     * 主调度 tick：找所有应该现在触发的 schedule，建盘点单
     */
    public function tick(): array
    {
        $rows = Db::name('stock_take_schedules')
            ->whereNull('deleted_at')->where('enabled', 1)->select()->toArray();
        if (!$rows) return ['scanned' => 0, 'triggered' => 0];

        $now = time();
        $h = (int)date('G', $now);
        $i = (int)date('i', $now);
        $dow = (int)date('N', $now);
        $dom = (int)date('j', $now);

        $triggered = 0; $takesCreated = [];
        foreach ($rows as $r) {
            if ((int)$r['hour'] !== $h || (int)$r['minute'] !== $i) continue;
            if (!$this->shouldFireOnDate($r, $dow, $dom)) continue;
            $lastTs = $r['last_triggered_at'] ? strtotime($r['last_triggered_at']) : 0;
            if ($lastTs && ($now - $lastTs) < self::RETRIGGER_MIN_HOURS * 3600) continue;

            try {
                $take = (new StockTakeService())->create([
                    'warehouse_code' => $r['warehouse_code'],
                    'scope_type' => $r['scope_type'],
                    'scope_value' => $r['scope_value'],
                    'created_by' => 'schedule#' . $r['id'],
                    'remark' => "[自动盘点] {$r['name']}",
                ]);
                $takeNo = $take['take']['take_no'] ?? null;
                Db::name('stock_take_schedules')->where('id', $r['id'])->update([
                    'last_triggered_at' => date('Y-m-d H:i:s', $now),
                    'last_created_take_no' => $takeNo,
                ]);
                $triggered++;
                $takesCreated[] = $takeNo;
            } catch (\Throwable $e) {
                error_log("[StockTakeScheduleService] tick schedule#{$r['id']} 失败: " . $e->getMessage());
            }
        }
        return ['scanned' => count($rows), 'triggered' => $triggered, 'takes' => $takesCreated];
    }

    private function shouldFireOnDate(array $r, int $dow, int $dom): bool
    {
        $type = $r['schedule_type'];
        if ($type === 'daily') return true;
        if ($type === 'weekly') {
            $list = $r['days_of_week'] ? json_decode($r['days_of_week'], true) : [];
            return is_array($list) && in_array($dow, $list, true);
        }
        if ($type === 'monthly') {
            return (int)$r['day_of_month'] === $dom;
        }
        return false;
    }

    private function validate(array $data): void
    {
        foreach (['name', 'warehouse_code', 'scope_type', 'schedule_type'] as $k) {
            if (empty($data[$k])) throw new \RuntimeException("{$k} 必填");
        }
        if (!in_array($data['scope_type'], ['all', 'zone', 'location', 'sku'], true)) {
            throw new \RuntimeException('scope_type 仅 all/zone/location/sku');
        }
        if (in_array($data['scope_type'], ['zone', 'location', 'sku'], true) && empty($data['scope_value'])) {
            throw new \RuntimeException("scope_type={$data['scope_type']} 需带 scope_value");
        }
        if (!in_array($data['schedule_type'], ['daily', 'weekly', 'monthly'], true)) {
            throw new \RuntimeException('schedule_type 仅 daily/weekly/monthly');
        }
        $h = (int)($data['hour'] ?? -1);
        $i = (int)($data['minute'] ?? -1);
        if ($h < 0 || $h > 23) throw new \RuntimeException('hour 0-23');
        if ($i < 0 || $i > 59) throw new \RuntimeException('minute 0-59');
        if ($data['schedule_type'] === 'weekly') {
            $dows = $data['days_of_week'] ?? [];
            if (!is_array($dows) || !$dows) throw new \RuntimeException('weekly 必须填 days_of_week');
            foreach ($dows as $d) {
                if ((int)$d < 1 || (int)$d > 7) throw new \RuntimeException('days_of_week 仅 1-7');
            }
        }
        if ($data['schedule_type'] === 'monthly') {
            $d = (int)($data['day_of_month'] ?? 0);
            if ($d < 1 || $d > 28) throw new \RuntimeException('day_of_month 仅 1-28（避开月底差异）');
        }
    }
}
