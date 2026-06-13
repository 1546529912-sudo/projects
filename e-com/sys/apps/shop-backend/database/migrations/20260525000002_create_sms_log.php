<?php
use think\migration\Migrator;

class CreateSmsLog extends Migrator
{
    public function change(): void
    {
        $this->table('sms_log', [
            'engine' => 'InnoDB',
            'collation' => 'utf8mb4_unicode_ci',
            'comment' => '验证码下发日志',
        ])
            ->addColumn('phone', 'string', ['limit' => 20])
            ->addColumn('code', 'string', ['limit' => 10])
            ->addColumn('purpose', 'string', ['limit' => 20, 'default' => 'login'])
            ->addColumn('success', 'boolean', ['default' => 0])
            ->addColumn('ip', 'string', ['limit' => 64, 'null' => true])
            ->addColumn('created_at', 'datetime', ['default' => 'CURRENT_TIMESTAMP'])
            ->addIndex(['phone', 'created_at'], ['name' => 'idx_phone_time'])
            ->create();
    }
}
