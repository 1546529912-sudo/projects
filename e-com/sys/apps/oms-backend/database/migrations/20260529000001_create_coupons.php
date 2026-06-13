<?php
use think\migration\Migrator;

/**
 * 优惠券模板表（iter-19）
 *   金额单位与 orders 表保持一致：分（bigint）
 *
 *   - type=threshold（满减）：discount_value = 减的分数（1000 = 减 ¥10）
 *   - type=percent  （折扣）：discount_value = 减百分比 1-99（15 = 减 15% = 8.5 折）
 *                              max_discount = 封顶分数（NULL = 不封顶）
 *   - min_amount    （门槛）：分（9900 = 满 ¥99）
 *   - status: active / disabled
 */
class CreateCoupons extends Migrator
{
    public function change(): void
    {
        $this->table('coupons', [
            'engine' => 'InnoDB',
            'collation' => 'utf8mb4_unicode_ci',
            'comment' => '优惠券模板',
        ])
            ->addColumn('name', 'string', ['limit' => 100])
            ->addColumn('type', 'string', ['limit' => 16, 'comment' => 'threshold/percent'])
            ->addColumn('discount_value', 'biginteger', ['signed' => false, 'comment' => 'threshold:分; percent:1-99'])
            ->addColumn('min_amount', 'biginteger', ['signed' => false, 'default' => 0, 'comment' => '门槛分'])
            ->addColumn('max_discount', 'biginteger', ['signed' => false, 'null' => true, 'comment' => '折扣封顶分'])
            ->addColumn('total_count', 'integer', ['default' => 0, 'comment' => '0=不限'])
            ->addColumn('per_user_limit', 'integer', ['default' => 1])
            ->addColumn('claimed_count', 'integer', ['default' => 0])
            ->addColumn('used_count', 'integer', ['default' => 0])
            ->addColumn('valid_from', 'datetime')
            ->addColumn('valid_to', 'datetime')
            ->addColumn('status', 'string', ['limit' => 16, 'default' => 'active'])
            ->addColumn('created_at', 'datetime', ['default' => 'CURRENT_TIMESTAMP'])
            ->addColumn('updated_at', 'datetime', ['default' => 'CURRENT_TIMESTAMP', 'update' => 'CURRENT_TIMESTAMP'])
            ->addIndex(['status', 'valid_to'], ['name' => 'idx_status_validto'])
            ->create();

        // seed 2 个示例券
        $now = date('Y-m-d H:i:s');
        $validTo = date('Y-m-d H:i:s', strtotime('+30 days'));
        $this->table('coupons')->insert([
            [
                'name' => '满 99 减 10',
                'type' => 'threshold',
                'discount_value' => 1000,    // 减 ¥10
                'min_amount' => 9900,        // 满 ¥99
                'total_count' => 1000,
                'per_user_limit' => 1,
                'valid_from' => $now,
                'valid_to' => $validTo,
                'status' => 'active',
                'created_at' => $now,
            ],
            [
                'name' => '全场 8.5 折（最高减 30）',
                'type' => 'percent',
                'discount_value' => 15,      // 15% off
                'min_amount' => 5000,        // 满 ¥50
                'max_discount' => 3000,      // 最多减 ¥30
                'total_count' => 500,
                'per_user_limit' => 1,
                'valid_from' => $now,
                'valid_to' => $validTo,
                'status' => 'active',
                'created_at' => $now,
            ],
        ])->saveData();
    }
}
