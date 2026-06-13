<?php
declare(strict_types=1);

namespace app\controller;

use think\Request;
use think\Response;
use think\facade\Db;

/**
 * WMS 商品 read replica（PIM 同步而来，iter-13）
 * 仅提供查询，不允许编辑。
 */
class Product
{
    /**
     * GET /api/v1/product/list?keyword=&active=1&page=&size=
     */
    public function list(Request $request): Response
    {
        $keyword = trim((string)$request->param('keyword', ''));
        $active = $request->param('active', '1');
        $page = max(1, (int)$request->param('page', 1));
        $size = max(1, min(50, (int)$request->param('size', 20)));

        $q = Db::name('wms_products');
        if ($active !== '' && $active !== 'all') {
            $q->where('is_active', $active ? 1 : 0);
        }
        if ($keyword) {
            $q->where(function ($w) use ($keyword) {
                $w->whereLike('sku_code', "%{$keyword}%")
                    ->whereOr('spu_name', 'like', "%{$keyword}%")
                    ->whereOr('sku_name', 'like', "%{$keyword}%");
            });
        }
        $total = (clone $q)->count();
        $rows = $q->order('sku_code', 'asc')->page($page, $size)->select()->toArray();
        return json(['code' => 0, 'msg' => 'ok', 'data' => [
            'list' => $rows, 'total' => $total, 'page' => $page, 'size' => $size,
        ]]);
    }
}
