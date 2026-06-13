<?php
use think\migration\Migrator;

/**
 * WMS 系统配置（iter-32 C）
 *   通用 KV 配置表，value 用 JSON 存任意结构
 *   首批：location_recommend_weights = {existing:40, golden:30, sameZone:20, capacity:10, capacityThreshold:100}
 */
class CreateWmsConfigs extends Migrator
{
    public function change(): void
    {
        $this->table('wms_configs', [
            'engine' => 'InnoDB',
            'collation' => 'utf8mb4_unicode_ci',
            'comment' => 'WMS 系统配置 KV',
        ])
            ->addColumn('config_key', 'string', ['limit' => 64])
            ->addColumn('config_value', 'json')
            ->addColumn('description', 'string', ['limit' => 255, 'null' => true])
            ->addColumn('updated_by', 'string', ['limit' => 64, 'null' => true])
            ->addColumn('updated_at', 'datetime', ['default' => 'CURRENT_TIMESTAMP', 'update' => 'CURRENT_TIMESTAMP'])
            ->addColumn('created_at', 'datetime', ['default' => 'CURRENT_TIMESTAMP'])
            ->addIndex(['config_key'], ['unique' => true, 'name' => 'uk_key'])
            ->create();
    }
}
