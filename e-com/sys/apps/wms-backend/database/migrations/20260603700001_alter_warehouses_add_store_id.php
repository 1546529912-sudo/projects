<?php
use think\migration\Migrator;

/**
 * warehouses 加 store_id + warehouse_type（iter-38 BIZ-08-4）
 *
 *   store_id      DEFAULT 1 NOT NULL，存量数据归平台店
 *   warehouse_type
 *     - 'self'     平台自营仓（默认）
 *     - 'merchant' 商家自有仓（商家入驻后建）
 */
class AlterWarehousesAddStoreId extends Migrator
{
    public function change(): void
    {
        $this->table('warehouses')
            ->addColumn('store_id', 'integer', [
                'signed' => false, 'default' => 1, 'null' => false,
                'after' => 'warehouse_code', 'comment' => '所属店铺',
            ])
            ->addColumn('warehouse_type', 'string', [
                'limit' => 16, 'default' => 'self', 'null' => false,
                'after' => 'store_id', 'comment' => 'self=自营 / merchant=商家仓',
            ])
            ->addIndex(['store_id'], ['name' => 'idx_store'])
            ->update();
    }
}
