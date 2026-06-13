<?php
declare(strict_types=1);

use think\migration\Migrator;

/**
 * iter-67 优惠券/评价/收藏深化（shop-backend 端）
 *   - reviews: + rating_logistics/service/quality + likes_count + merchant_reply + replied_at
 *   - favorites: + group_name + last_seen_price_cents + notify_enabled
 *   - addresses: + lat / lng (LBS)
 */
class Iter67ReviewFavoriteAddress extends Migrator
{
    public function change(): void
    {
        if ($this->hasTable('reviews')) {
            $t = $this->table('reviews');
            if (!$t->hasColumn('rating_logistics')) $t->addColumn('rating_logistics', 'integer', ['limit' => 1, 'default' => 0, 'comment' => '物流分 1-5']);
            if (!$t->hasColumn('rating_service')) $t->addColumn('rating_service', 'integer', ['limit' => 1, 'default' => 0]);
            if (!$t->hasColumn('rating_quality')) $t->addColumn('rating_quality', 'integer', ['limit' => 1, 'default' => 0]);
            if (!$t->hasColumn('likes_count')) $t->addColumn('likes_count', 'integer', ['default' => 0]);
            if (!$t->hasColumn('merchant_reply')) $t->addColumn('merchant_reply', 'string', ['limit' => 500, 'null' => true]);
            if (!$t->hasColumn('replied_at')) $t->addColumn('replied_at', 'datetime', ['null' => true]);
            $t->update();
        }
        if ($this->hasTable('favorites')) {
            $t = $this->table('favorites');
            if (!$t->hasColumn('group_name')) $t->addColumn('group_name', 'string', ['limit' => 32, 'default' => '默认']);
            if (!$t->hasColumn('last_seen_price_cents')) $t->addColumn('last_seen_price_cents', 'integer', ['default' => 0]);
            if (!$t->hasColumn('notify_enabled')) $t->addColumn('notify_enabled', 'integer', ['limit' => 1, 'default' => 1]);
            $t->update();
        }
        if ($this->hasTable('addresses')) {
            $t = $this->table('addresses');
            if (!$t->hasColumn('lat')) $t->addColumn('lat', 'decimal', ['precision' => 10, 'scale' => 7, 'null' => true]);
            if (!$t->hasColumn('lng')) $t->addColumn('lng', 'decimal', ['precision' => 10, 'scale' => 7, 'null' => true]);
            $t->update();
        }
        if (!$this->hasTable('review_likes')) {
            $this->table('review_likes', ['comment' => 'iter-67 Q20-03 评价点赞流水'])
                ->addColumn('review_id', 'integer')
                ->addColumn('user_id', 'integer')
                ->addColumn('created_at', 'datetime', ['default' => 'CURRENT_TIMESTAMP'])
                ->addIndex(['review_id', 'user_id'], ['unique' => true, 'name' => 'uk_review_user'])
                ->create();
        }
    }
}
