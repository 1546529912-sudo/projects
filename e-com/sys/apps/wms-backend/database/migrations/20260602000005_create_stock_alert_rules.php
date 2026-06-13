<?php
use think\migration\Migrator;

/**
 * 低库存预警规则（iter-25）
 *   - 每 SKU 一行，UNIQUE 兜底
 *   - threshold: WMS 总可用 (SUM(quantity - locked_quantity)) 低于此触发预警
 *   - enabled: 临时禁用而非删除
 */
class CreateStockAlertRules extends Migrator
{
    public function change(): void
    {
        $this->table('stock_alert_rules', [
            'engine' => 'InnoDB',
            'collation' => 'utf8mb4_unicode_ci',
            'comment' => '低库存预警规则',
        ])
            ->addColumn('sku_code', 'string', ['limit' => 64])
            ->addColumn('threshold', 'integer', ['default' => 0])
            ->addColumn('enabled', 'boolean', ['default' => 1])
            ->addColumn('remark', 'string', ['limit' => 255, 'default' => ''])
            ->addColumn('created_by', 'string', ['limit' => 64])
            ->addColumn('created_at', 'datetime', ['default' => 'CURRENT_TIMESTAMP'])
            ->addColumn('updated_at', 'datetime', ['default' => 'CURRENT_TIMESTAMP', 'update' => 'CURRENT_TIMESTAMP'])
            ->addIndex(['sku_code'], ['unique' => true, 'name' => 'uk_sku'])
            ->create();
    }
}
