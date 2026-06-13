<?php
use think\migration\Migrator;

/**
 * orders 加 store_id + parent_order_no（iter-37 BIZ-08-3）
 *
 *   store_id      该单所属店铺，默认 1=平台店
 *   parent_order_no
 *     - NULL:        单店单（旧链路 + 新链路同店时）
 *     - PO...:       多店拆单后的子单引用同一父单号（父单不入 orders 表，仅作逻辑容器）
 */
class AlterOrdersAddStoreId extends Migrator
{
    public function change(): void
    {
        $this->table('orders')
            ->addColumn('store_id', 'integer', [
                'signed' => false, 'default' => 1, 'null' => false,
                'after' => 'user_id', 'comment' => '所属店铺',
            ])
            ->addColumn('parent_order_no', 'string', [
                'limit' => 32, 'null' => true,
                'after' => 'order_no', 'comment' => '多店拆单父单号；NULL=单店单',
            ])
            ->addIndex(['store_id', 'status'], ['name' => 'idx_store_status'])
            ->addIndex(['parent_order_no'], ['name' => 'idx_parent_no'])
            ->update();
    }
}
