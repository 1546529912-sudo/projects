<?php
use think\migration\Migrator;

/**
 * 盘点定时调度（iter-32 B）
 *
 *   schedule_type:
 *     - daily     每天 hour:minute
 *     - weekly    每周 days_of_week JSON 中的 day，hour:minute
 *     - monthly   每月 day_of_month，hour:minute
 *
 *   触发：command/StockTakeSchedule loop 每 60s 扫一次
 *     - 时间到 + enabled=1 + 上次触发与现在间隔 ≥ 23h（避免同一 minute 多次触发）
 *     - 调 StockTakeService.create 建盘点单
 */
class CreateStockTakeSchedules extends Migrator
{
    public function change(): void
    {
        $this->table('stock_take_schedules', [
            'engine' => 'InnoDB',
            'collation' => 'utf8mb4_unicode_ci',
            'comment' => '盘点定时调度',
        ])
            ->addColumn('name', 'string', ['limit' => 100])
            ->addColumn('warehouse_code', 'string', ['limit' => 32])
            ->addColumn('scope_type', 'string', ['limit' => 20])
            ->addColumn('scope_value', 'string', ['limit' => 100, 'null' => true])
            ->addColumn('schedule_type', 'string', ['limit' => 20])
            ->addColumn('hour', 'integer', ['default' => 0])
            ->addColumn('minute', 'integer', ['default' => 0])
            ->addColumn('days_of_week', 'json', ['null' => true, 'comment' => '[1,3,5] 周一三五 (1-7)'])
            ->addColumn('day_of_month', 'integer', ['null' => true])
            ->addColumn('enabled', 'boolean', ['default' => 1])
            ->addColumn('last_triggered_at', 'datetime', ['null' => true])
            ->addColumn('last_created_take_no', 'string', ['limit' => 32, 'null' => true])
            ->addColumn('created_by', 'string', ['limit' => 64])
            ->addColumn('created_at', 'datetime', ['default' => 'CURRENT_TIMESTAMP'])
            ->addColumn('updated_at', 'datetime', ['default' => 'CURRENT_TIMESTAMP', 'update' => 'CURRENT_TIMESTAMP'])
            ->addColumn('deleted_at', 'datetime', ['null' => true])
            ->addIndex(['enabled', 'schedule_type'], ['name' => 'idx_enabled_type'])
            ->create();
    }
}
