<?php
use think\migration\Migrator;

class CreateOutboundItems extends Migrator
{
    public function change(): void
    {
        $this->table('outbound_items', [
            'engine' => 'InnoDB',
            'collation' => 'utf8mb4_unicode_ci',
            'comment' => '出库明细',
        ])
            ->addColumn('outbound_no', 'string', ['limit' => 32])
            ->addColumn('sku_code', 'string', ['limit' => 64])
            ->addColumn('qty', 'integer', ['signed' => false])
            ->addColumn('picked_qty', 'integer', ['default' => 0])
            ->addColumn('location_code', 'string', ['limit' => 32, 'null' => true])
            ->addColumn('batch_no', 'string', ['limit' => 64, 'null' => true])
            ->addColumn('created_at', 'datetime', ['default' => 'CURRENT_TIMESTAMP'])
            ->addIndex(['outbound_no'], ['name' => 'idx_outbound'])
            ->create();
    }
}
