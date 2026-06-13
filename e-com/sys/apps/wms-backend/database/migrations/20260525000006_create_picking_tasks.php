<?php
use think\migration\Migrator;

class CreatePickingTasks extends Migrator
{
    public function change(): void
    {
        $this->table('picking_tasks', [
            'engine' => 'InnoDB',
            'collation' => 'utf8mb4_unicode_ci',
            'comment' => 'PDA 拣货任务',
        ])
            ->addColumn('outbound_no', 'string', ['limit' => 32])
            ->addColumn('sku_code', 'string', ['limit' => 64])
            ->addColumn('location_code', 'string', ['limit' => 32])
            ->addColumn('batch_no', 'string', ['limit' => 64, 'null' => true])
            ->addColumn('expected_qty', 'integer')
            ->addColumn('picked_qty', 'integer', ['default' => 0])
            ->addColumn('status', 'string', ['limit' => 20, 'default' => 'pending'])
            ->addColumn('picked_at', 'datetime', ['null' => true])
            ->addColumn('sort', 'integer', ['default' => 0])
            ->addColumn('created_at', 'datetime', ['default' => 'CURRENT_TIMESTAMP'])
            ->addIndex(['outbound_no', 'status'], ['name' => 'idx_outbound_status'])
            ->create();
    }
}
