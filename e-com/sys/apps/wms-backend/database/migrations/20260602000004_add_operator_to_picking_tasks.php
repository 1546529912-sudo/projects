<?php
use think\migration\Migrator;

/**
 * picking_tasks 加 operator + assigned_at（iter-24 P1-1）
 */
class AddOperatorToPickingTasks extends Migrator
{
    public function change(): void
    {
        $this->table('picking_tasks')
            ->addColumn('operator', 'string', ['limit' => 64, 'null' => true, 'after' => 'status'])
            ->addColumn('assigned_at', 'datetime', ['null' => true, 'after' => 'operator'])
            ->update();
    }
}
