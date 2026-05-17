<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use App\Services\ReportService;
use App\Models\DailyReport;

class ReportController extends Controller
{
    public function __construct(private ReportService $reportService) {}

    public function create(Request $request): JsonResponse
    {
        $request->validate([
            'date' => 'required|date_format:Y-m-d',
            'records' => 'required|array|min:1',
            'records.*.project_name' => 'required|string',
            'records.*.actions' => 'required|array',
        ]);

        try {
            $report = $this->reportService->generate(
                $request->user()->id,
                $request->date,
                $request->records
            );

            return response()->json([
                'code' => 0,
                'message' => 'success',
                'data' => $report,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'code' => 5021,
                'message' => '日报生成失败：' . $e->getMessage(),
                'data' => null,
            ], 500);
        }
    }

    public function save(Request $request): JsonResponse
    {
        $request->validate([
            'date' => 'required|date_format:Y-m-d',
            'content' => 'required|array',
            'template' => 'nullable|string|in:personal,formal',
        ]);

        $report = DailyReport::updateOrCreate(
            [
                'user_id' => $request->user()->id,
                'report_date' => $request->date,
            ],
            [
                'content' => $request->content,
                'template' => $request->template ?? 'personal',
            ]
        );

        return response()->json([
            'code' => 0,
            'message' => 'success',
            'data' => ['report_id' => $report->id],
        ]);
    }

    public function history(Request $request): JsonResponse
    {
        $request->validate([
            'page' => 'nullable|integer|min:1',
            'per_page' => 'nullable|integer|min:1|max:50',
            'project' => 'nullable|string',
        ]);

        $query = DailyReport::where('user_id', $request->user()->id)
            ->orderBy('report_date', 'desc');

        // TODO: 项目筛选逻辑（Phase 4）

        $reports = $query->paginate($request->per_page ?? 20);

        return response()->json([
            'code' => 0,
            'message' => 'success',
            'data' => $reports,
        ]);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $report = DailyReport::where('user_id', $request->user()->id)
            ->findOrFail($id);

        return response()->json([
            'code' => 0,
            'message' => 'success',
            'data' => $report,
        ]);
    }
}
