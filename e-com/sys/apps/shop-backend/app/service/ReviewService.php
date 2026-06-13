<?php
declare(strict_types=1);

namespace app\service;

use think\facade\Db;

/**
 * 评价服务（iter-20）
 *   - submit: 校验订单 completed + 用户匹配 + sku 在订单内 + (order_no, sku_code) 唯一
 *   - bySpu: SPU 详情评价区，active 前 N + 平均分
 *   - my: 我的评价
 *   - aggregate: 给 BFF productDetail 聚合用
 *
 *   订单在 oms_db，本服务用 Db::connect('oms') 副连接读校验
 */
class ReviewService
{
    private function oms(string $tbl)
    {
        return Db::connect('oms')->name($tbl);
    }

    public function submit(int $userId, string $orderNo, string $skuCode, int $rating, string $content, array $images, array $extra = []): array
    {
        if ($rating < 1 || $rating > 5) throw new \RuntimeException('评分必须 1-5');
        if (mb_strlen($content) > 1000) throw new \RuntimeException('评价内容不能超过 1000 字');
        if (count($images) > 9) throw new \RuntimeException('图片不能超过 9 张');

        // 校验订单归属 + 状态 + SKU 在订单内
        $order = $this->oms('orders')->where('order_no', $orderNo)->find();
        if (!$order) throw new \RuntimeException('订单不存在');
        if ((int)$order['user_id'] !== $userId) throw new \RuntimeException('非本人订单');
        if ($order['status'] !== 'completed') throw new \RuntimeException('订单未完成，不可评价');

        $item = $this->oms('order_items')
            ->where('order_no', $orderNo)
            ->where('sku_code', $skuCode)
            ->find();
        if (!$item) throw new \RuntimeException('SKU 不在订单内');

        // 从 sku_snapshot 取 spu_id
        $snap = is_string($item['sku_snapshot']) ? json_decode($item['sku_snapshot'], true) : ($item['sku_snapshot'] ?? []);
        $spuId = (int)($snap['spu_id'] ?? 0);
        if (!$spuId) throw new \RuntimeException('订单数据异常：缺少 SPU 关联');

        try {
            $id = Db::name('reviews')->insertGetId([
                'user_id' => $userId,
                'order_no' => $orderNo,
                'sku_code' => $skuCode,
                'spu_id' => $spuId,
                'rating' => $rating,
                // iter-67 Q20-01 多维度（0=未打分）
                'rating_logistics' => (int)($extra['rating_logistics'] ?? 0),
                'rating_service' => (int)($extra['rating_service'] ?? 0),
                'rating_quality' => (int)($extra['rating_quality'] ?? 0),
                'content' => $content,
                'images' => $images ? json_encode($images, JSON_UNESCAPED_UNICODE) : null,
                'status' => 'active',
                'created_at' => date('Y-m-d H:i:s'),
            ]);
        } catch (\Throwable $e) {
            if (str_contains($e->getMessage(), 'Duplicate')) {
                throw new \RuntimeException('该商品已评价过');
            }
            throw $e;
        }
        return Db::name('reviews')->where('id', $id)->find();
    }

    public function bySpu(int $spuId, int $page = 1, int $size = 20): array
    {
        $q = Db::name('reviews')->where('spu_id', $spuId)->where('status', 'active');
        $total = $q->count();
        $rows = (clone $q)
            ->order('id', 'desc')
            ->page($page, $size)
            ->select()
            ->toArray();
        foreach ($rows as &$r) {
            $r['images'] = $r['images'] ? json_decode($r['images'], true) : [];
        }
        return ['total' => $total, 'page' => $page, 'size' => $size, 'list' => $rows, 'aggregate' => $this->aggregate($spuId)];
    }

    public function aggregate(int $spuId): array
    {
        $row = Db::name('reviews')
            ->where('spu_id', $spuId)
            ->where('status', 'active')
            ->field('COUNT(*) as cnt, COALESCE(AVG(rating), 0) as avg_rating')
            ->find();
        $cnt = (int)($row['cnt'] ?? 0);
        $avg = $cnt > 0 ? round((float)$row['avg_rating'], 1) : 0.0;
        return ['count' => $cnt, 'avg_rating' => $avg];
    }

    public function my(int $userId, int $page = 1, int $size = 20): array
    {
        $q = Db::name('reviews')->where('user_id', $userId);
        $total = $q->count();
        $rows = (clone $q)
            ->order('id', 'desc')
            ->page($page, $size)
            ->select()
            ->toArray();
        foreach ($rows as &$r) {
            $r['images'] = $r['images'] ? json_decode($r['images'], true) : [];
        }
        return ['total' => $total, 'page' => $page, 'size' => $size, 'list' => $rows];
    }

    /**
     * 给 SPU 详情用：返回前 3 条 + 聚合
     */
    public function preview(int $spuId, int $n = 3): array
    {
        $rows = Db::name('reviews')
            ->where('spu_id', $spuId)
            ->where('status', 'active')
            ->order('id', 'desc')
            ->limit($n)
            ->select()
            ->toArray();
        foreach ($rows as &$r) {
            $r['images'] = $r['images'] ? json_decode($r['images'], true) : [];
        }
        $agg = $this->aggregate($spuId);
        return ['count' => $agg['count'], 'avg_rating' => $agg['avg_rating'], 'list' => $rows];
    }

    // iter-67 Q20-03 点赞（review_likes UNIQUE 防重复）
    public function like(int $reviewId, int $userId): array
    {
        $r = Db::name('reviews')->where('id', $reviewId)->find();
        if (!$r) throw new \RuntimeException('评价不存在');
        try {
            Db::name('review_likes')->insert(['review_id' => $reviewId, 'user_id' => $userId]);
            Db::name('reviews')->where('id', $reviewId)->inc('likes_count')->update();
            return ['review_id' => $reviewId, 'liked' => true, 'likes_count' => (int)$r['likes_count'] + 1];
        } catch (\Throwable $e) {
            if (str_contains($e->getMessage(), 'Duplicate')) {
                // 取消点赞
                Db::name('review_likes')->where('review_id', $reviewId)->where('user_id', $userId)->delete();
                Db::name('reviews')->where('id', $reviewId)->where('likes_count', '>', 0)->dec('likes_count')->update();
                return ['review_id' => $reviewId, 'liked' => false, 'likes_count' => max(0, (int)$r['likes_count'] - 1)];
            }
            throw $e;
        }
    }

    // iter-67 Q20-03 商家回复
    public function reply(int $reviewId, string $reply): array
    {
        $r = Db::name('reviews')->where('id', $reviewId)->find();
        if (!$r) throw new \RuntimeException('评价不存在');
        Db::name('reviews')->where('id', $reviewId)->update([
            'merchant_reply' => mb_substr($reply, 0, 500),
            'replied_at' => date('Y-m-d H:i:s'),
        ]);
        return Db::name('reviews')->where('id', $reviewId)->find();
    }
}
