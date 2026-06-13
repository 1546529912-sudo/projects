<?php
use think\migration\Migrator;

/**
 * 自动发券规则（iter-27 Q19-02）
 *   trigger_type:
 *     - user_register      首次登录创建用户（小程序手机号验证码）触发
 *     - order_completed    M3+ 留位（订单完成后赠下次券）
 */
class CreateCouponAutoRules extends Migrator
{
    public function change(): void
    {
        $this->table('coupon_auto_rules', [
            'engine' => 'InnoDB',
            'collation' => 'utf8mb4_unicode_ci',
            'comment' => '优惠券自动发放规则',
        ])
            ->addColumn('name', 'string', ['limit' => 100])
            ->addColumn('trigger_type', 'string', ['limit' => 32, 'comment' => 'user_register/order_completed'])
            ->addColumn('coupon_id', 'integer', ['signed' => false])
            ->addColumn('per_user_limit', 'integer', ['default' => 1])
            ->addColumn('granted_count', 'integer', ['default' => 0])
            ->addColumn('enabled', 'boolean', ['default' => 1])
            ->addColumn('remark', 'string', ['limit' => 255, 'default' => ''])
            ->addColumn('created_by', 'string', ['limit' => 64])
            ->addColumn('created_at', 'datetime', ['default' => 'CURRENT_TIMESTAMP'])
            ->addColumn('updated_at', 'datetime', ['default' => 'CURRENT_TIMESTAMP', 'update' => 'CURRENT_TIMESTAMP'])
            ->addIndex(['trigger_type', 'enabled'], ['name' => 'idx_trigger_enabled'])
            ->create();
    }
}
