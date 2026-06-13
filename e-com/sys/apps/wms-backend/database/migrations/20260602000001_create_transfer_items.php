<?php
use think\migration\Migrator;

/**
 * 多 SKU 批量调拨（iter-23 / Q22-01）
 *   1) ALTER transfers：把 inline SKU/库位/批次/qty 改 nullable（旧数据保留）
 *   2) CREATE transfer_items：明细行，每行独立 from/to 库位 + SKU + 批次 + qty
 */
class CreateTransferItems extends Migrator
{
    public function change(): void
    {
        // 1) ALTER transfers
        $this->table('transfers')
            ->changeColumn('sku_code', 'string', ['limit' => 64, 'null' => true])
            ->changeColumn('batch_no', 'string', ['limit' => 64, 'null' => true])
            ->changeColumn('from_location', 'string', ['limit' => 32, 'null' => true])
            ->changeColumn('to_location', 'string', ['limit' => 32, 'null' => true])
            ->changeColumn('qty', 'integer', ['null' => true])
            ->update();

        // 2) CREATE transfer_items
        $this->table('transfer_items', [
            'engine' => 'InnoDB',
            'collation' => 'utf8mb4_unicode_ci',
            'comment' => '调拨明细（iter-23 多 SKU）',
        ])
            ->addColumn('transfer_no', 'string', ['limit' => 32])
            ->addColumn('line_no', 'integer')
            ->addColumn('sku_code', 'string', ['limit' => 64])
            ->addColumn('batch_no', 'string', ['limit' => 64, 'default' => 'INIT'])
            ->addColumn('from_location', 'string', ['limit' => 32])
            ->addColumn('to_location', 'string', ['limit' => 32])
            ->addColumn('qty', 'integer')
            ->addIndex(['transfer_no'], ['name' => 'idx_transfer_no'])
            ->create();
    }
}
