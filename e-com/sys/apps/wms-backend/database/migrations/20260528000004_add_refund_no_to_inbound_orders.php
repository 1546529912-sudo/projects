<?php
use think\migration\Migrator;

/**
 * inbound_orders 加 refund_no 字段：
 *   source_type=return 时关联 OMS 退款单（iter-15）
 *   auto-complete 时连同事件 payload 发出，OMS 据此调 markReceivedBack
 */
class AddRefundNoToInboundOrders extends Migrator
{
    public function change(): void
    {
        $this->table('inbound_orders')
            ->addColumn('refund_no', 'string', ['limit' => 32, 'null' => true, 'after' => 'source_type'])
            ->addIndex(['refund_no'], ['name' => 'idx_refund_no'])
            ->update();
    }
}
