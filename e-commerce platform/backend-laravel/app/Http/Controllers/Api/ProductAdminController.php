<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\Sku;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * 后台商品 CRUD
 *
 * 对应：
 * - TRADE-007-01 商品新建/编辑
 * - TRADE-007-03 商品上下架
 * - TRADE-007-04 库存管理
 */
class ProductAdminController extends Controller
{
    // GET /api/v1/admin/products
    public function index(Request $request): JsonResponse
    {
        $perPage = (int) ($request->input('per_page', 20));
        $kw = $request->input('keyword');
        $status = $request->input('status');

        $q = Product::with('defaultSku')->latest();
        if ($kw) {
            $q->where(fn ($qq) => $qq
                ->where('name', 'like', "%$kw%")
                ->orWhere('model', 'like', "%$kw%"));
        }
        if ($status) {
            $q->where('status', $status);
        }
        $page = $q->paginate($perPage);

        return $this->ok([
            'items' => array_map(fn ($p) => $this->toAdminJson($p), $page->items()),
            'total' => $page->total(),
            'page' => $page->currentPage(),
            'per_page' => $page->perPage(),
        ]);
    }

    // POST /api/v1/admin/products
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'category_id' => 'required|integer|exists:categories,id',
            'name' => 'required|string|max:255',
            'model' => 'required|string|max:128|unique:products,model',
            'keywords' => 'nullable|string|max:512',
            'main_image_url' => 'nullable|url|max:512',
            'description' => 'nullable|string',
            'status' => 'nullable|in:draft,active,inactive',
            'base_price' => 'required|numeric|min:0',
            'stock' => 'required|integer|min:0',
            'stock_threshold' => 'nullable|integer|min:0',
        ]);

        return DB::transaction(function () use ($data) {
            $product = Product::create([
                'category_id' => $data['category_id'],
                'name' => $data['name'],
                'model' => $data['model'],
                'keywords' => $data['keywords'] ?? null,
                'main_image_url' => $data['main_image_url'] ?? null,
                'description' => $data['description'] ?? null,
                'status' => $data['status'] ?? 'active',
            ]);

            $sku = Sku::create([
                'product_id' => $product->id,
                'sku_code' => $product->model,
                'base_price' => $data['base_price'],
                'stock' => $data['stock'],
                'stock_threshold' => $data['stock_threshold'] ?? 10,
                'status' => 'active',
            ]);
            app(\App\Services\StockAlertService::class)->check($sku->id);

            return $this->ok(['product' => $this->toAdminJson($product->load('defaultSku'))]);
        });
    }

    // GET /api/v1/admin/products/{id}
    public function show(int $id): JsonResponse
    {
        $product = Product::with('defaultSku')->findOrFail($id);
        return $this->ok(['product' => $this->toAdminJson($product)]);
    }

    // PUT /api/v1/admin/products/{id}
    public function update(Request $request, int $id): JsonResponse
    {
        $product = Product::with('defaultSku')->findOrFail($id);

        $data = $request->validate([
            'category_id' => 'sometimes|integer|exists:categories,id',
            'name' => 'sometimes|string|max:255',
            'model' => "sometimes|string|max:128|unique:products,model,{$id}",
            'keywords' => 'nullable|string|max:512',
            'main_image_url' => 'nullable|url|max:512',
            'description' => 'nullable|string',
            'status' => 'sometimes|in:draft,active,inactive',
            'base_price' => 'sometimes|numeric|min:0',
            'stock' => 'sometimes|integer|min:0',
            'stock_threshold' => 'sometimes|integer|min:0',
        ]);

        return DB::transaction(function () use ($product, $data) {
            $product->fill(array_intersect_key($data, array_flip([
                'category_id', 'name', 'model', 'keywords',
                'main_image_url', 'description', 'status',
            ])));
            $product->save();

            $skuChanged = false;
            $sku = null;
            if (isset($data['base_price']) || isset($data['stock']) || isset($data['stock_threshold'])) {
                $sku = $product->defaultSku;
                if (! $sku) {
                    $sku = Sku::create([
                        'product_id' => $product->id,
                        'sku_code' => $product->model,
                        'base_price' => $data['base_price'] ?? 0,
                        'stock' => $data['stock'] ?? 0,
                        'stock_threshold' => $data['stock_threshold'] ?? 10,
                    ]);
                    $skuChanged = true;
                } else {
                    if (isset($data['base_price'])) $sku->base_price = $data['base_price'];
                    if (isset($data['stock'])) $sku->stock = $data['stock'];
                    if (isset($data['stock_threshold'])) $sku->stock_threshold = $data['stock_threshold'];
                    $sku->save();
                    $skuChanged = isset($data['stock']) || isset($data['stock_threshold']);
                }
            }

            if ($skuChanged && $sku) {
                app(\App\Services\StockAlertService::class)->check($sku->id);
            }

            return $this->ok(['product' => $this->toAdminJson($product->fresh('defaultSku'))]);
        });
    }

    // POST /api/v1/admin/products/{id}/toggle
    public function toggle(Request $request, int $id): JsonResponse
    {
        $product = Product::findOrFail($id);
        $product->status = $product->status === 'active' ? 'inactive' : 'active';
        $product->save();

        return $this->ok(['id' => $product->id, 'status' => $product->status]);
    }

    private function toAdminJson(Product $p): array
    {
        return [
            'id' => $p->id,
            'category_id' => $p->category_id,
            'name' => $p->name,
            'model' => $p->model,
            'keywords' => $p->keywords,
            'main_image_url' => $p->main_image_url,
            'description' => $p->description,
            'status' => $p->status,
            'view_count' => $p->view_count,
            'base_price' => $p->defaultSku?->base_price,
            'stock' => $p->defaultSku?->stock,
            'stock_threshold' => $p->defaultSku?->stock_threshold,
            'created_at' => $p->created_at?->toIso8601String(),
            'updated_at' => $p->updated_at?->toIso8601String(),
        ];
    }

    private function ok(array $data): JsonResponse
    {
        return response()->json(['code' => 0, 'message' => 'ok', 'data' => $data]);
    }
}
