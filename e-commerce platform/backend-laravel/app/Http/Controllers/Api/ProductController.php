<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * 前台商品 Controller
 *
 * 对应：
 * - TRADE-002-01 首页推荐
 * - TRADE-002-02 分类导航
 * - TRADE-002-03 商品搜索
 * - TRADE-002-04 商品列表
 * - TRADE-002-05 商品详情
 */
class ProductController extends Controller
{
    // GET /api/v1/products
    public function index(Request $request): JsonResponse
    {
        $data = $request->validate([
            'keyword' => 'nullable|string|max:100',
            'category_id' => 'nullable|integer',
            'min_price' => 'nullable|numeric|min:0',
            'max_price' => 'nullable|numeric|min:0',
            'sort' => 'nullable|in:price,sales,latest',
            'order' => 'nullable|in:asc,desc',
            'page' => 'nullable|integer|min:1',
            'per_page' => 'nullable|integer|min:1|max:100',
        ]);

        $perPage = $data['per_page'] ?? 20;
        $sort = $data['sort'] ?? 'latest';
        $order = $data['order'] ?? 'desc';

        $query = Product::with(['skus.priceTiers'])
            ->where('status', 'active');

        if (! empty($data['keyword'])) {
            $kw = $data['keyword'];
            $query->where(fn ($q) => $q
                ->where('name', 'like', "%$kw%")
                ->orWhere('model', 'like', "%$kw%")
                ->orWhere('keywords', 'like', "%$kw%"));
        }

        if (! empty($data['category_id'])) {
            $query->where('category_id', $data['category_id']);
        }

        if (isset($data['min_price']) || isset($data['max_price'])) {
            $query->whereHas('defaultSku', function ($q) use ($data) {
                if (isset($data['min_price'])) $q->where('base_price', '>=', $data['min_price']);
                if (isset($data['max_price'])) $q->where('base_price', '<=', $data['max_price']);
            });
        }

        if ($sort === 'price') {
            // 按价格排序：join skus
            $query->join('skus', 'skus.product_id', '=', 'products.id')
                ->select('products.*')
                ->orderBy('skus.base_price', $order);
        } elseif ($sort === 'sales') {
            $query->orderBy('view_count', $order);
        } else {
            $query->orderBy('created_at', $order);
        }

        $page = $query->paginate($perPage);

        return $this->ok([
            'items' => array_map(fn ($p) => $this->toCardJson($p), $page->items()),
            'total' => $page->total(),
            'page' => $page->currentPage(),
            'per_page' => $page->perPage(),
        ]);
    }

    // GET /api/v1/products/recommended
    public function recommended(): JsonResponse
    {
        $items = Product::with(['skus.priceTiers'])
            ->where('status', 'active')
            ->latest()
            ->take(4)
            ->get()
            ->map(fn ($p) => $this->toCardJson($p));

        return $this->ok(['items' => $items]);
    }

    // GET /api/v1/products/{id}
    public function show(int $id): JsonResponse
    {
        $product = Product::with([
            'category',
            'skus' => fn ($q) => $q->where('status', 'active')->orderBy('id'),
            'skus.priceTiers',
            'skus.specs',
        ])->where('status', 'active')->findOrFail($id);

        $product->increment('view_count');

        $skusJson = $product->skus->map(function ($sku) {
            return [
                'id' => $sku->id,
                'sku_code' => $sku->sku_code,
                'base_price' => $sku->base_price,
                'stock' => $sku->stock,
                'stock_status' => $sku->stock > 0 ? 'in_stock' : 'out_of_stock',
                'specs' => $sku->specs->map(fn ($s) => [
                    'key' => $s->spec_key,
                    'value' => $s->spec_value,
                    'unit' => $s->spec_unit,
                ])->values(),
                'price_tiers' => $sku->priceTiers->map(fn ($t) => [
                    'min_qty' => $t->min_qty,
                    'max_qty' => $t->max_qty,
                    'unit_price' => $t->unit_price,
                ])->values(),
                'price_range' => $sku->priceRange(),
            ];
        });

        // 全 SKU 价格区间（用于"起价"展示）
        $allPrices = $product->skus->flatMap(function ($sku) {
            return $sku->priceTiers->pluck('unit_price')->push($sku->base_price);
        })->map(fn ($p) => (float) $p);

        return $this->ok([
            'id' => $product->id,
            'name' => $product->name,
            'model' => $product->model,
            'keywords' => $product->keywords,
            'main_image_url' => $product->main_image_url,
            'detail_images' => $product->detail_images,
            'description' => $product->description,
            'spec_pdf_url' => $product->spec_pdf_url,
            'category' => $product->category ? [
                'id' => $product->category->id,
                'name' => $product->category->name,
                'slug' => $product->category->slug,
            ] : null,
            'skus' => $skusJson,
            'price_range' => $allPrices->isNotEmpty() ? [
                'min' => number_format($allPrices->min(), 2, '.', ''),
                'max' => number_format($allPrices->max(), 2, '.', ''),
            ] : null,
            'view_count' => $product->view_count,
        ]);
    }

    private function toCardJson(Product $p): array
    {
        // 起价：从所有 SKU 的 priceTiers 取最低单价（兜底 base_price）
        $p->loadMissing(['skus.priceTiers']);
        $minPrice = $p->skus->flatMap(function ($sku) {
            $vals = $sku->priceTiers->pluck('unit_price');
            return $vals->isEmpty() ? collect([$sku->base_price]) : $vals;
        })->map(fn ($v) => (float) $v)->min();

        $totalStock = (int) $p->skus->sum('stock');

        return [
            'id' => $p->id,
            'name' => $p->name,
            'model' => $p->model,
            'main_image_url' => $p->main_image_url,
            'price' => $minPrice !== null ? number_format($minPrice, 2, '.', '') : null,
            'price_from' => true, // 标记是"起价"
            'stock' => $totalStock,
            'stock_status' => $totalStock > 0 ? 'in_stock' : 'out_of_stock',
            'sku_count' => $p->skus->count(),
        ];
    }

    private function ok(array|\Illuminate\Support\Collection $data): JsonResponse
    {
        return response()->json(['code' => 0, 'message' => 'ok', 'data' => $data]);
    }
}
