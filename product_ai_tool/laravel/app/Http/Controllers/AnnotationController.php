<?php

namespace App\Http\Controllers;

use App\Models\Annotation;
use App\Models\Demo;
use App\Services\DemoRevisionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AnnotationController extends Controller
{
    public function index(Request $request, Demo $demo): JsonResponse
    {
        $query = $demo->annotations()->orderByDesc('id');

        if (! $request->boolean('all')) {
            $pageKey = $request->query('page_key');
            if (is_string($pageKey) && $pageKey !== '') {
                $query->where('page_key', $pageKey);
            }
        }

        $status = $request->query('status');
        if (is_string($status) && $status !== '') {
            $query->where('status', $status);
        }

        return response()->json(['data' => $query->get()]);
    }

    public function store(Request $request, Demo $demo): JsonResponse
    {
        $demo->loadMissing('currentVersion');
        if (! $demo->current_version_id) {
            return response()->json(['ok' => false, 'message' => 'Demo has no current version'], 422);
        }

        $validated = $request->validate([
            'page_key' => ['required', 'string', 'max:128'],
            'state_key' => ['nullable', 'string', 'max:128'],
            'x_percent' => ['required', 'numeric', 'min:0', 'max:100'],
            'y_percent' => ['required', 'numeric', 'min:0', 'max:100'],
            'iframe_scroll_x' => ['nullable', 'numeric'],
            'iframe_scroll_y' => ['nullable', 'numeric'],
            'title' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:10000'],
            'type' => ['nullable', 'string', 'in:说明,修改建议,问题'],
        ]);

        $annotation = $demo->annotations()->create([
            'demo_version_id' => $demo->current_version_id,
            'page_key' => $validated['page_key'],
            'state_key' => $validated['state_key'] ?? null,
            'x_percent' => $validated['x_percent'],
            'y_percent' => $validated['y_percent'],
            'iframe_scroll_x' => $validated['iframe_scroll_x'] ?? null,
            'iframe_scroll_y' => $validated['iframe_scroll_y'] ?? null,
            'title' => $validated['title'] ?? '新标注',
            'description' => $validated['description'] ?? null,
            'type' => $validated['type'] ?? '说明',
            'status' => '未处理',
        ]);

        return response()->json(['ok' => true, 'data' => $annotation], Response::HTTP_CREATED);
    }

    public function update(Request $request, int $annotation): JsonResponse
    {
        $row = Annotation::query()->find($annotation);
        if ($row === null) {
            return response()->json([
                'ok' => false,
                'message' => '标注不存在或已删除，请刷新页面后重试。',
            ], 404);
        }

        $validated = $request->validate([
            'title' => ['sometimes', 'nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:10000'],
            'type' => ['sometimes', 'string', 'in:说明,修改建议,问题'],
            'status' => ['sometimes', 'string', 'in:未处理,已完成'],
            'x_percent' => ['sometimes', 'numeric', 'min:0', 'max:100'],
            'y_percent' => ['sometimes', 'numeric', 'min:0', 'max:100'],
        ]);

        if (array_key_exists('title', $validated)) {
            $t = $validated['title'];
            if ($t === null || trim((string) $t) === '') {
                $validated['title'] = '新标注';
            }
        }

        $row->update($validated);

        return response()->json(['ok' => true, 'data' => $row->fresh()]);
    }

    public function destroy(int $annotation): JsonResponse
    {
        $row = Annotation::query()->find($annotation);
        if ($row !== null) {
            $row->delete();
        }

        return response()->json(['ok' => true]);
    }

    public function revise(Request $request, int $annotation, DemoRevisionService $revision): JsonResponse
    {
        $row = Annotation::query()->find($annotation);
        if ($row === null) {
            return response()->json([
                'ok' => false,
                'message' => '标注不存在或已删除，请刷新页面后重试。',
            ], 404);
        }

        $validated = $request->validate([
            'user_instruction' => ['nullable', 'string', 'max:10000'],
        ]);

        try {
            $version = $revision->reviseFromAnnotation(
                $row,
                $validated['user_instruction'] ?? null
            );
        } catch (\Throwable $e) {
            report($e);

            return response()->json([
                'ok' => false,
                'message' => $e->getMessage(),
            ], 422);
        }

        $row->refresh();

        return response()->json([
            'ok' => true,
            'new_version_id' => $version->id,
            'preview_url' => route('demos.preview', $row->demo).'?cb='.$version->id,
            'data' => $row,
        ]);
    }
}
