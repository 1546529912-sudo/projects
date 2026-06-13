<?php
use think\migration\Migrator;

/**
 * 图片库（iter-30 C）
 *   - 每次 Upload/image 成功落盘后插入 1 行，URL 作为唯一识别
 *   - tags JSON 数组（可选标签，运营手填）
 *   - used_count 留接口未来由 PIM SPU 引用计数（v1 仅记录上传，不强联）
 */
class CreateImageLibrary extends Migrator
{
    public function change(): void
    {
        $this->table('image_library', [
            'engine' => 'InnoDB',
            'collation' => 'utf8mb4_unicode_ci',
            'comment' => '图片素材库',
        ])
            ->addColumn('url', 'string', ['limit' => 500])
            ->addColumn('original_name', 'string', ['limit' => 200, 'null' => true])
            ->addColumn('size_bytes', 'biginteger', ['signed' => false, 'default' => 0])
            ->addColumn('mime', 'string', ['limit' => 80, 'null' => true])
            ->addColumn('uploader', 'string', ['limit' => 64, 'null' => true])
            ->addColumn('tags', 'json', ['null' => true])
            ->addColumn('used_count', 'integer', ['default' => 0])
            ->addColumn('created_at', 'datetime', ['default' => 'CURRENT_TIMESTAMP'])
            ->addColumn('deleted_at', 'datetime', ['null' => true])
            ->addIndex(['url'], ['unique' => true, 'name' => 'uk_url'])
            ->addIndex(['created_at'], ['name' => 'idx_created'])
            ->create();
    }
}
