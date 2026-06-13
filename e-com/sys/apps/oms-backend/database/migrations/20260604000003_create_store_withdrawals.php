<?php
use think\migration\Migrator;

/**
 * 商家自助提现单（iter-50 · Q35-03 / Q39-03 BIZ-08 收口最后一公里）
 *
 *   状态机：pending → approved → paid
 *                  ↘ rejected
 *
 *   余额计算（动态）：
 *     可提现 = SUM(settlement_orders.amount WHERE store_id=X) - SUM(approved/paid withdrawals.amount WHERE store_id=X)
 *     即：settlement 净额（含负的 commission/refund）扣除已批准/已打款提现
 *
 *   平台店 store_id=1 不允许提现（自营无需）
 */
class CreateStoreWithdrawals extends Migrator
{
    public function change(): void
    {
        $this->table('store_withdrawals', [
            'engine' => 'InnoDB',
            'collation' => 'utf8mb4_unicode_ci',
            'comment' => '商家自助提现单',
        ])
            ->addColumn('withdrawal_no', 'string', ['limit' => 32, 'comment' => 'WD202606xxx'])
            ->addColumn('store_id', 'integer', ['signed' => false])
            ->addColumn('amount', 'biginteger', ['comment' => '提现金额（分）'])
            ->addColumn('balance_at_apply', 'biginteger', ['comment' => '申请时可提现余额（分）'])
            ->addColumn('status', 'string', ['limit' => 16, 'default' => 'pending', 'comment' => 'pending/approved/rejected/paid'])
            ->addColumn('requested_by', 'string', ['limit' => 64, 'null' => true, 'comment' => '申请人 username'])
            ->addColumn('approved_by', 'string', ['limit' => 64, 'null' => true])
            ->addColumn('approved_at', 'datetime', ['null' => true])
            ->addColumn('rejected_reason', 'string', ['limit' => 255, 'null' => true])
            ->addColumn('paid_by', 'string', ['limit' => 64, 'null' => true])
            ->addColumn('paid_at', 'datetime', ['null' => true])
            ->addColumn('paid_method', 'string', ['limit' => 32, 'null' => true, 'comment' => 'bank/alipay/wechat 等'])
            ->addColumn('paid_ref', 'string', ['limit' => 128, 'null' => true, 'comment' => '银行流水号/支付凭证'])
            ->addColumn('remark', 'string', ['limit' => 500, 'null' => true])
            ->addColumn('created_at', 'datetime', ['default' => 'CURRENT_TIMESTAMP'])
            ->addColumn('updated_at', 'datetime', ['default' => 'CURRENT_TIMESTAMP', 'update' => 'CURRENT_TIMESTAMP'])
            ->addIndex(['withdrawal_no'], ['unique' => true, 'name' => 'uk_no'])
            ->addIndex(['store_id', 'status'], ['name' => 'idx_store_status'])
            ->addIndex(['status', 'created_at'], ['name' => 'idx_status_created'])
            ->create();
    }
}
