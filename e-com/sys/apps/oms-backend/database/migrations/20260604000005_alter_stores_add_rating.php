<?php
use think\migration\Migrator;

/**
 * 店铺评分（iter-56 Q39-04）
 * 简化版：rating_avg + review_count + last_calc_at
 * 实际计算由 cron 定时跨库 shop_db.reviews 聚合 → update stores
 */
class AlterStoresAddRating extends Migrator
{
    public function change(): void
    {
        $t = $this->table('stores');
        $t->addColumn('rating_avg', 'decimal', ['precision' => 3, 'scale' => 2, 'default' => 0, 'after' => 'commission_rate'])
          ->addColumn('review_count', 'integer', ['signed' => false, 'default' => 0, 'after' => 'rating_avg'])
          ->addColumn('rating_calc_at', 'datetime', ['null' => true, 'after' => 'review_count'])
          ->update();
    }
}
