<?php
declare(strict_types=1);

use think\migration\Migrator;

/**
 * iter-69 WMS/拣货/调拨深化
 *   - locations: + max_quantity（Q25-02 精确容量）
 *   - transfer_items: + line_status / line_cancel_reason（Q23-01/02 明细级）
 *   - wms_configs: 加 4 默认 key（Q32-03）
 */
class Iter69WmsDeepen extends Migrator
{
    public function change(): void
    {
        if ($this->hasTable('locations')) {
            $t = $this->table('locations');
            if (!$t->hasColumn('max_quantity')) {
                $t->addColumn('max_quantity', 'integer', ['default' => 0, 'comment' => '0=不限；>0=该库位最大容量'])->update();
            }
        }
        if ($this->hasTable('transfer_items')) {
            $t = $this->table('transfer_items');
            if (!$t->hasColumn('line_status')) {
                $t->addColumn('line_status', 'string', ['limit' => 20, 'default' => 'draft', 'comment' => 'draft/shipped/received/cancelled']);
            }
            if (!$t->hasColumn('received_qty')) {
                $t->addColumn('received_qty', 'integer', ['default' => 0, 'comment' => 'Q23-01 部分接收数量']);
            }
            if (!$t->hasColumn('line_cancel_reason')) {
                $t->addColumn('line_cancel_reason', 'string', ['limit' => 200, 'null' => true]);
            }
            $t->update();
        }
        // Q32-03 wms_configs 加 key
        if ($this->hasTable('wms_configs')) {
            $defaults = [
                ['picking.fifo_priority', '1', 'iter-69 Q32-03 FIFO 拣货优先级开关'],
                ['inbound.upshelf_threshold_pct', '90', 'iter-69 Q32-03 推荐 Top 库位容量阈值'],
                ['stock_take.auto_diff_threshold', '5', 'iter-69 Q32-03 盘点自动调差上限（单 SKU）'],
                ['transfer.cross_warehouse_lock', '1', 'iter-69 Q32-03 跨仓调拨独占锁开关'],
            ];
            foreach ($defaults as $d) {
                $exist = $this->fetchRow("SELECT id FROM wms_configs WHERE config_key='{$d[0]}'");
                if (!$exist) {
                    $this->execute("INSERT INTO wms_configs (config_key, config_value, description) VALUES ('{$d[0]}', '{$d[1]}', '{$d[2]}')");
                }
            }
        }
    }
}
