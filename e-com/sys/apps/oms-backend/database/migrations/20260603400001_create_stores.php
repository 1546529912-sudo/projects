<?php
use think\migration\Migrator;

/**
 * 店铺主表（iter-35 BIZ-08-1 架构地基）
 *
 *   平台 ↔ N 个店铺 ↔ 各自管理员
 *
 *   id=1 默认平台店（存量数据全归此店）
 *   status:
 *     pending   申请中（自助入驻还未审核）
 *     approved  已通过 → 可上架
 *     suspended 平台暂停（违规等，临时停止店铺销售但保留数据）
 *     closed    永久关闭
 *
 *   commission_rate: 平台抽佣率（如 0.0500 = 5%），订单 confirm 时按此算 settlement
 */
class CreateStores extends Migrator
{
    public function change(): void
    {
        $table = $this->table('stores', [
            'engine' => 'InnoDB',
            'collation' => 'utf8mb4_unicode_ci',
            'comment' => '店铺主表',
        ])
            ->addColumn('code', 'string', ['limit' => 32])
            ->addColumn('name', 'string', ['limit' => 100])
            ->addColumn('logo_url', 'string', ['limit' => 500, 'null' => true])
            ->addColumn('description', 'string', ['limit' => 1000, 'null' => true])
            ->addColumn('status', 'string', ['limit' => 20, 'default' => 'pending'])
            ->addColumn('contact_name', 'string', ['limit' => 50, 'null' => true])
            ->addColumn('contact_phone', 'string', ['limit' => 20, 'null' => true])
            ->addColumn('business_license', 'string', ['limit' => 100, 'null' => true])
            ->addColumn('commission_rate', 'decimal', ['precision' => 5, 'scale' => 4, 'default' => 0.0500, 'comment' => '抽佣率 0.05=5%'])
            ->addColumn('approved_at', 'datetime', ['null' => true])
            ->addColumn('approved_by', 'string', ['limit' => 64, 'null' => true])
            ->addColumn('suspended_at', 'datetime', ['null' => true])
            ->addColumn('suspended_reason', 'string', ['limit' => 200, 'null' => true])
            ->addColumn('created_at', 'datetime', ['default' => 'CURRENT_TIMESTAMP'])
            ->addColumn('updated_at', 'datetime', ['default' => 'CURRENT_TIMESTAMP', 'update' => 'CURRENT_TIMESTAMP'])
            ->addColumn('deleted_at', 'datetime', ['null' => true])
            ->addIndex(['code'], ['unique' => true, 'name' => 'uk_code'])
            ->addIndex(['status'], ['name' => 'idx_status'])
            ->create();

        // 插入 id=1 平台店
        $this->execute("INSERT INTO stores (id, code, name, description, status, commission_rate, approved_at, approved_by, created_at) VALUES (1, 'platform', '平台自营', '默认店铺，存量数据归属此店', 'approved', 0.0000, NOW(), 'system', NOW())");
    }
}
