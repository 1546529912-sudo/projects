<?php
use think\migration\Migrator;

/**
 * OMS 其他业务表加 store_id（iter-37 BIZ-08-3）
 *   - refund_orders（跟 order 一致）
 *   - exchange_orders（跟 order 一致）
 *   - settlement_orders（按店分桶）
 *   - admin_audit_log（操作所属店；NULL=平台操作）
 *   - webhook_subscriptions（各店配各自；NULL=平台级订阅）
 *   - coupons（NULL=平台券 / 非 NULL=店铺券）
 */
class AlterOmsTablesAddStoreId extends Migrator
{
    public function change(): void
    {
        $this->table('refund_orders')
            ->addColumn('store_id', 'integer', ['signed' => false, 'default' => 1, 'null' => false, 'after' => 'order_no'])
            ->addIndex(['store_id'], ['name' => 'idx_store'])
            ->update();

        $this->table('exchange_orders')
            ->addColumn('store_id', 'integer', ['signed' => false, 'default' => 1, 'null' => false, 'after' => 'order_no'])
            ->addIndex(['store_id'], ['name' => 'idx_store'])
            ->update();

        $this->table('settlement_orders')
            ->addColumn('store_id', 'integer', ['signed' => false, 'default' => 1, 'null' => false, 'after' => 'ref_no'])
            ->addIndex(['store_id'], ['name' => 'idx_store'])
            ->update();

        $this->table('admin_audit_log')
            ->addColumn('store_id', 'integer', ['signed' => false, 'null' => true, 'after' => 'operator', 'comment' => 'NULL=平台操作'])
            ->addIndex(['store_id'], ['name' => 'idx_store'])
            ->update();

        $this->table('webhook_subscriptions')
            ->addColumn('store_id', 'integer', ['signed' => false, 'null' => true, 'after' => 'name', 'comment' => 'NULL=平台级'])
            ->addIndex(['store_id'], ['name' => 'idx_store'])
            ->update();

        $this->table('coupons')
            ->addColumn('store_id', 'integer', ['signed' => false, 'null' => true, 'after' => 'name', 'comment' => 'NULL=平台券通用'])
            ->addIndex(['store_id'], ['name' => 'idx_store'])
            ->update();
    }
}
