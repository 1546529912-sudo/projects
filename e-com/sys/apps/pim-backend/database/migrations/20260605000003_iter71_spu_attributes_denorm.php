<?php
declare(strict_types=1);

use think\migration\Migrator;

/**
 * iter-71 Q30-01：spu_attributes 反范式（强约束 + 索引筛选）
 *   - 主路径仍读 spus.attrs JSON（兼容现有）
 *   - 反范式表用于 admin/spu/list?attr_key=color&attr_value=red 类强索引筛选
 *   - 写入：在 SpuService.create / update 时同步刷该表
 */
class Iter71SpuAttributesDenorm extends Migrator
{
    public function change(): void
    {
        if (!$this->hasTable('spu_attributes')) {
            $this->table('spu_attributes', ['comment' => 'iter-71 Q30-01 SPU 属性反范式表'])
                ->addColumn('spu_id', 'integer')
                ->addColumn('attr_key', 'string', ['limit' => 64])
                ->addColumn('attr_value', 'string', ['limit' => 200])
                ->addColumn('created_at', 'datetime', ['default' => 'CURRENT_TIMESTAMP'])
                ->addIndex(['spu_id', 'attr_key'], ['unique' => true, 'name' => 'uk_spu_key'])
                ->addIndex(['attr_key', 'attr_value'], ['name' => 'idx_key_value'])
                ->create();
        }
    }
}
