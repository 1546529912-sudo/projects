<?php
declare(strict_types=1);

use think\migration\Migrator;

/**
 * iter-71 PIM/导出深化
 *   - export_tasks: Q28-02 异步导出（status pending/running/done/failed + progress + file_path）
 *   - import_tasks: Q30-02 异步导入（同结构 + total_rows + processed_rows）
 */
class Iter71ExportImportTasks extends Migrator
{
    public function change(): void
    {
        if (!$this->hasTable('export_tasks')) {
            $this->table('export_tasks', ['comment' => 'iter-71 Q28-02 异步导出任务'])
                ->addColumn('admin_user_id', 'integer')
                ->addColumn('scope', 'string', ['limit' => 32, 'comment' => 'orders/refunds/inventory/spus...'])
                ->addColumn('format', 'string', ['limit' => 16, 'default' => 'csv', 'comment' => 'csv/xlsx'])
                ->addColumn('filters_json', 'text', ['null' => true])
                ->addColumn('status', 'string', ['limit' => 20, 'default' => 'pending'])
                ->addColumn('progress', 'integer', ['default' => 0, 'comment' => '0-100'])
                ->addColumn('file_path', 'string', ['limit' => 255, 'null' => true])
                ->addColumn('error', 'string', ['limit' => 500, 'null' => true])
                ->addColumn('created_at', 'datetime', ['default' => 'CURRENT_TIMESTAMP'])
                ->addColumn('finished_at', 'datetime', ['null' => true])
                ->addIndex(['admin_user_id', 'status'], ['name' => 'idx_admin_status'])
                ->create();
        }
        if (!$this->hasTable('import_tasks')) {
            $this->table('import_tasks', ['comment' => 'iter-71 Q30-02 异步导入任务'])
                ->addColumn('admin_user_id', 'integer')
                ->addColumn('scope', 'string', ['limit' => 32, 'comment' => 'spus/skus/...'])
                ->addColumn('source_path', 'string', ['limit' => 255])
                ->addColumn('status', 'string', ['limit' => 20, 'default' => 'pending'])
                ->addColumn('total_rows', 'integer', ['default' => 0])
                ->addColumn('processed_rows', 'integer', ['default' => 0])
                ->addColumn('error_rows', 'integer', ['default' => 0])
                ->addColumn('error_excerpt', 'string', ['limit' => 1000, 'null' => true])
                ->addColumn('created_at', 'datetime', ['default' => 'CURRENT_TIMESTAMP'])
                ->addColumn('finished_at', 'datetime', ['null' => true])
                ->addIndex(['admin_user_id', 'status'], ['name' => 'idx_admin_status'])
                ->create();
        }
    }
}
