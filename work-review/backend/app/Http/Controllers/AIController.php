<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use App\Services\AIExtractService;

class AIController extends Controller
{
    public function __construct(private AIExtractService $aiService) {}

    public function extract(Request $request): JsonResponse
    {
        $request->validate([
            'text' => 'required|string|min:5|max:5000',
            'record_id' => 'nullable|integer|exists:work_records,id',
        ]);

        try {
            $result = $this->aiService->extract($request->text);

            return response()->json([
                'code' => 0,
                'message' => 'success',
                'data' => $result,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'code' => 5021,
                'message' => 'AI 服务异常：' . $e->getMessage(),
                'data' => null,
            ], 500);
        }
    }

    public function split(Request $request): JsonResponse
    {
        $request->validate([
            'text' => 'required|string|min:5|max:5000',
        ]);

        try {
            $result = $this->aiService->splitProjects($request->text);

            return response()->json([
                'code' => 0,
                'message' => 'success',
                'data' => $result,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'code' => 5021,
                'message' => 'AI 项目拆分异常：' . $e->getMessage(),
                'data' => null,
            ], 500);
        }
    }
}
