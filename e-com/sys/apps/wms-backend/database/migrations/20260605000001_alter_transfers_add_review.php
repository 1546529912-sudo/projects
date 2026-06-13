<?php
declare(strict_types=1);

use think\migration\Migrator;

/**
 * iter-61 Q38-01：跨店调拨平台代理审核流
 *   transfers 加：
 *     - needs_review tinyint default 0
 *     - reviewed_by varchar
 *     - reviewed_at datetime
 *     - cross_store_from / cross_store_to int default 1
 */
class AlterTransfersAddReview extends Migrator
{
    public function change(): void
    {
        $t = $this->table('transfers');
        if (!$t->hasColumn('needs_review')) {
            $t->addColumn('needs_review', 'integer', ['limit' => 1, 'default' => 0, 'comment' => '1=跨店待平台代理审核', 'after' => 'status']);
        }
        if (!$t->hasColumn('reviewed_by')) {
            $t->addColumn('reviewed_by', 'string', ['limit' => 100, 'null' => true, 'after' => 'needs_review']);
        }
        if (!$t->hasColumn('reviewed_at')) {
            $t->addColumn('reviewed_at', 'datetime', ['null' => true, 'after' => 'reviewed_by']);
        }
        if (!$t->hasColumn('cross_store_from')) {
            $t->addColumn('cross_store_from', 'integer', ['default' => 1, 'comment' => '源仓 store_id 快照', 'after' => 'reviewed_at']);
        }
        if (!$t->hasColumn('cross_store_to')) {
            $t->addColumn('cross_store_to', 'integer', ['default' => 1, 'comment' => '目标仓 store_id 快照', 'after' => 'cross_store_from']);
        }
        $t->update();
    }
}
