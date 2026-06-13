<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use Illuminate\Http\JsonResponse;

class CategoryController extends Controller
{
    // GET /api/v1/categories
    public function index(): JsonResponse
    {
        $items = Category::where('status', 'active')
            ->orderBy('sort_order')
            ->get()
            ->map(fn ($c) => [
                'id' => $c->id,
                'parent_id' => $c->parent_id,
                'name' => $c->name,
                'slug' => $c->slug,
                'icon_url' => $c->icon_url,
                'sort_order' => $c->sort_order,
            ]);

        return response()->json(['code' => 0, 'message' => 'ok', 'data' => $items]);
    }
}
