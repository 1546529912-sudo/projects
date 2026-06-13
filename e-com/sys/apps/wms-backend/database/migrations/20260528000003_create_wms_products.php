<?php
use think\migration\Migrator;

/**
 * WMS 商品主数据（PIM 推送 pim.sku.changed 同步而来）
 *   - sku_code 唯一，UPSERT 语义
 *   - 仅 WMS 关心字段：spu_code/spu_name/sku_name/main_image/price/is_active
 *   - 不存价格历史；不存详情 HTML（WMS 不展示）
 */
class CreateWmsProducts extends Migrator
{
    public function change(): void
    {
        $this->table('wms_products', [
            'engine' => 'InnoDB',
            'collation' => 'utf8mb4_unicode_ci',
            'comment' => 'WMS 视角的商品主数据（PIM 推送同步）',
        ])
            ->addColumn('sku_code', 'string', ['limit' => 64])
            ->addColumn('spu_code', 'string', ['limit' => 64, 'null' => true])
            ->addColumn('spu_name', 'string', ['limit' => 200, 'null' => true])
            ->addColumn('sku_name', 'string', ['limit' => 200, 'null' => true, 'comment' => 'sales_attrs 拼接，如 "红 / L"'])
            ->addColumn('main_image', 'string', ['limit' => 500, 'null' => true])
            ->addColumn('price', 'biginteger', ['signed' => false, 'default' => 0])
            ->addColumn('is_active', 'boolean', ['default' => true, 'comment' => 'SPU.status=published AND SKU.status=enabled'])
            ->addColumn('created_at', 'datetime', ['default' => 'CURRENT_TIMESTAMP'])
            ->addColumn('updated_at', 'datetime', ['default' => 'CURRENT_TIMESTAMP', 'update' => 'CURRENT_TIMESTAMP'])
            ->addIndex(['sku_code'], ['unique' => true, 'name' => 'uniq_sku_code'])
            ->addIndex(['spu_code'], ['name' => 'idx_spu_code'])
            ->create();
    }
}
