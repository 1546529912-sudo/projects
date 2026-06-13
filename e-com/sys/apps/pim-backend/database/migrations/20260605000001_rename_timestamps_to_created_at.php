<?php
declare(strict_types=1);

use think\migration\Migrator;

/**
 * iter-66 Q48-04：时间字段命名统一
 *   PIM 4 张表（categories / brands / spus / skus）从 addTimestamps() 默认
 *   create_time / update_time 改名为 created_at / updated_at，与全工程其他表对齐。
 *
 *   - 用 CHANGE COLUMN 兼容 MySQL 5.7+/8+
 *   - 数据 0 丢失（仅改名）
 *   - update_time 顺手删（从未被 Db::name 写入；想用 updated_at 后续单独加 trigger）
 */
class RenameTimestampsToCreatedAt extends Migrator
{
    public function up(): void
    {
        $tables = ['categories', 'brands', 'spus', 'skus'];
        foreach ($tables as $t) {
            // create_time → created_at
            $this->execute("ALTER TABLE `{$t}` CHANGE COLUMN `create_time` `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP");
            // update_time 改名而非删除（保留历史 null 数据），并加 ON UPDATE
            $this->execute("ALTER TABLE `{$t}` CHANGE COLUMN `update_time` `updated_at` TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP");
        }
    }

    public function down(): void
    {
        $tables = ['categories', 'brands', 'spus', 'skus'];
        foreach ($tables as $t) {
            $this->execute("ALTER TABLE `{$t}` CHANGE COLUMN `created_at` `create_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP");
            $this->execute("ALTER TABLE `{$t}` CHANGE COLUMN `updated_at` `update_time` TIMESTAMP NULL DEFAULT NULL");
        }
    }
}
