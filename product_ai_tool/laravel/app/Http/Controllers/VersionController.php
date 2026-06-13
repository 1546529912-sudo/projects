<?php

namespace App\Http\Controllers;

use App\Models\Demo;
use App\Models\DemoVersion;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class VersionController extends Controller
{
    public function index(Demo $demo): JsonResponse
    {
        $rows = $demo->versions()
            ->orderByDesc('created_at')
            ->orderByDesc('version_no')
            ->get(['id', 'version_no', 'source_type', 'model', 'created_at', 'source_annotation_id'])
            ->map(function (DemoVersion $version) use ($demo) {
                return [
                    'id' => $version->id,
                    'version_no' => $version->version_no,
                    'source_type' => $version->source_type,
                    'model' => $version->model,
                    'created_at' => $version->created_at,
                    'source_annotation_id' => $version->source_annotation_id,
                    'title' => $demo->title ?: '未命名 Demo',
                ];
            })
            ->values();

        return response()->json([
            'data' => $rows,
            'current_version_id' => $demo->current_version_id,
        ]);
    }

    public function restore(Request $request, Demo $demo, int $version): JsonResponse
    {
        $v = DemoVersion::query()
            ->where('demo_id', $demo->id)
            ->where('id', $version)
            ->firstOrFail();

        $demo->update(['current_version_id' => $v->id]);

        return response()->json([
            'ok' => true,
            'current_version_id' => $v->id,
            'preview_url' => route('demos.preview', $demo).'?cb='.$v->id,
        ]);
    }
}
