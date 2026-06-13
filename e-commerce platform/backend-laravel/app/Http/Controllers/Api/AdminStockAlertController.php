<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\StockAlert;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * 后台库存预警 · iter-11
 *
 * - GET  /api/v1/admin/stock-alerts?status=open|resolved|all
 * - POST /api/v1/admin/stock-alerts/{id}/resolve  手动标记已处理
 */
class AdminStockAlertController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $status = $request->input('status', 'open');
        $perPage = (int) $request->input('per_page', 20);

        $q = StockAlert::with('sku.product')->latest('triggered_at');
        if ($status !== 'all') $q->where('status', $status);

        $page = $q->paginate($perPage);

        return $this->ok([
            'items' => array_map(fn ($a) => $this->toJson($a), $page->items()),
            'total' => $page->total(),
            'page' => $page->currentPage(),
            'per_page' => $page->perPage(),
            'open_count' => StockAlert::where('status', 'open')->count(),
        ]);
    }

    public function resolve(int $id): JsonResponse
    {
        $alert = StockAlert::findOrFail($id);
        if ($alert->status === 'resolved') {
            return $this->ok(['alert' => $this->toJson($alert)]);
        }
        $alert->update(['status' => 'resolved', 'resolved_at' => now()]);
        return $this->ok(['alert' => $this->toJson($alert->fresh('sku.product'))]);
    }

    private function toJson(StockAlert $a): array
    {
        return [
            'id' => $a->id,
            'sku_id' => $a->sku_id,
            'sku_code' => $a->sku?->sku_code,
            'product_id' => $a->sku?->product_id,
            'product_name' => $a->sku?->product?->name,
            'current_stock' => $a->current_stock,
            'threshold' => $a->threshold,
            'status' => $a->status,
            'webhook_status' => $a->webhook_status,
            'webhook_response' => $a->webhook_response,
            'webhook_attempts' => (int) $a->webhook_attempts,
            'triggered_at' => $a->triggered_at?->toIso8601String(),
            'resolved_at' => $a->resolved_at?->toIso8601String(),
        ];
    }

    private function ok(array $data): JsonResponse
    {
        return response()->json(['code' => 0, 'message' => 'ok', 'data' => $data]);
    }
}
