<?php
use think\migration\Migrator;

class CreateDeadLetter extends Migrator
{
    public function change(): void
    {
        $this->table('dead_letter', [
            'engine' => 'InnoDB',
            'collation' => 'utf8mb4_unicode_ci',
            'comment' => 'Stream 消费失败死信队列',
        ])
            ->addColumn('stream', 'string', ['limit' => 100])
            ->addColumn('event_id', 'string', ['limit' => 100])
            ->addColumn('payload', 'json')
            ->addColumn('error', 'text', ['null' => true])
            ->addColumn('retry_count', 'integer', ['default' => 0])
            ->addColumn('created_at', 'datetime', ['default' => 'CURRENT_TIMESTAMP'])
            ->addIndex(['stream'], ['name' => 'idx_stream'])
            ->addIndex(['created_at'], ['name' => 'idx_created'])
            ->create();
    }
}
