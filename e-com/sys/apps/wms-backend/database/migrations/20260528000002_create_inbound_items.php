<?php
use think\migration\Migrator;

class CreateInboundItems extends Migrator
{
    public function change(): void
    {
        $this->table('inbound_items', [
            'engine' => 'InnoDB',
            'collation' => 'utf8mb4_unicode_ci',
            'comment' => '入库单明细',
        ])
            ->addColumn('inbound_no', 'string', ['limit' => 32])
            ->addColumn('sku_code', 'string', ['limit' => 64])
            ->addColumn('expected_qty', 'integer', ['signed' => false])
            ->addColumn('actual_qty', 'integer', ['signed' => false, 'default' => 0])
            ->addColumn('shelved_qty', 'integer', ['signed' => false, 'default' => 0])
            ->addColumn('location_code', 'string', ['limit' => 32, 'null' => true])
            ->addColumn('batch_no', 'string', ['limit' => 64, 'null' => true])
            ->addColumn('created_at', 'datetime', ['default' => 'CURRENT_TIMESTAMP'])
            ->addIndex(['inbound_no'], ['name' => 'idx_inbound'])
            ->addIndex(['sku_code'], ['name' => 'idx_sku'])
            ->create();
    }
}
