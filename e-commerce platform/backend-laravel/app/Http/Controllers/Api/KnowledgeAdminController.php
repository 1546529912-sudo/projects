<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\KnowledgeBase;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * 知识库后台 · AI-004
 */
class KnowledgeAdminController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $kw = $request->input('keyword');
        $cat = $request->input('category');
        $status = $request->input('status');

        $q = KnowledgeBase::query()->latest();
        if ($kw) $q->where(fn ($qq) => $qq->where('title', 'like', "%$kw%")->orWhere('content', 'like', "%$kw%"));
        if ($cat) $q->where('category', $cat);
        if ($status) $q->where('status', $status);

        $page = $q->paginate((int) $request->input('per_page', 20));
        return $this->ok([
            'items' => $page->items(),
            'total' => $page->total(),
            'page' => $page->currentPage(),
            'per_page' => $page->perPage(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'title' => 'required|string|max:255',
            'content' => 'required|string',
            'category' => 'required|string|max:64',
            'keywords' => 'nullable|string|max:512',
            'source' => 'nullable|string|max:255',
            'status' => 'sometimes|in:draft,pending_review,active,disabled',
        ]);
        $data['author_id'] = $request->user()->id;
        $data['status'] = $data['status'] ?? 'active';

        $kb = KnowledgeBase::create($data);
        return $this->ok(['knowledge' => $kb]);
    }

    public function show(int $id): JsonResponse
    {
        return $this->ok(['knowledge' => KnowledgeBase::findOrFail($id)]);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $kb = KnowledgeBase::findOrFail($id);
        $data = $request->validate([
            'title' => 'sometimes|string|max:255',
            'content' => 'sometimes|string',
            'category' => 'sometimes|string|max:64',
            'keywords' => 'nullable|string|max:512',
            'source' => 'nullable|string|max:255',
            'status' => 'sometimes|in:draft,pending_review,active,disabled',
        ]);
        $kb->fill($data)->save();
        return $this->ok(['knowledge' => $kb->fresh()]);
    }

    public function destroy(int $id): JsonResponse
    {
        $kb = KnowledgeBase::findOrFail($id);
        $kb->delete();
        return $this->ok(['id' => $id]);
    }

    public function toggle(int $id): JsonResponse
    {
        $kb = KnowledgeBase::findOrFail($id);
        $kb->status = $kb->status === 'active' ? 'disabled' : 'active';
        $kb->save();
        return $this->ok(['id' => $kb->id, 'status' => $kb->status]);
    }

    private function ok(array $data): JsonResponse
    {
        return response()->json(['code' => 0, 'message' => 'ok', 'data' => $data]);
    }
}
