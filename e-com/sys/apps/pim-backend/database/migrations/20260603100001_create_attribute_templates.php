<?php
use think\migration\Migrator;

/**
 * 属性模板（iter-30 B）
 *   - code/name 唯一识别
 *   - attrs JSON 数组：[{name, code, type=text|select|number, options?, sort, required}]
 *   - 与 spus.attrs JSON 字段对接：用户在 SPU 编辑页"应用模板"，attrs schema 一键填到 SPU
 *   - 不做强约束（不建 spu_attributes 反范式表），保持 SPU JSON 灵活性
 */
class CreateAttributeTemplates extends Migrator
{
    public function change(): void
    {
        $this->table('attribute_templates', [
            'engine' => 'InnoDB',
            'collation' => 'utf8mb4_unicode_ci',
            'comment' => '属性模板（颜色/尺码/材质等）',
        ])
            ->addColumn('code', 'string', ['limit' => 64])
            ->addColumn('name', 'string', ['limit' => 100])
            ->addColumn('desc', 'string', ['limit' => 500, 'null' => true])
            ->addColumn('attrs', 'json', ['comment' => '属性 schema 数组'])
            ->addColumn('status', 'string', ['limit' => 20, 'default' => 'enabled'])
            ->addColumn('created_at', 'datetime', ['default' => 'CURRENT_TIMESTAMP'])
            ->addColumn('updated_at', 'datetime', ['default' => 'CURRENT_TIMESTAMP', 'update' => 'CURRENT_TIMESTAMP'])
            ->addColumn('deleted_at', 'datetime', ['null' => true])
            ->addIndex(['code'], ['unique' => true, 'name' => 'uk_code'])
            ->create();
    }
}
