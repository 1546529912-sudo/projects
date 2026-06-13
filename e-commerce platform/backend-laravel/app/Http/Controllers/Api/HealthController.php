<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Redis;

/**
 * 健康检查 · 端到端联通链路验证
 *
 * 路径: GET /api/v1/health
 * 检查: MySQL / Redis / FastAPI(AI 服务)
 */
class HealthController extends Controller
{
    public function index(): JsonResponse
    {
        $checks = [
            'mysql' => $this->checkMysql(),
            'redis' => $this->checkRedis(),
            'ai_service' => $this->checkAiService(),
        ];

        $allHealthy = collect($checks)->every(fn ($c) => $c['ok'] === true);

        return response()->json([
            'code' => $allHealthy ? 0 : 9001,
            'message' => $allHealthy ? 'ok' : 'one or more dependencies are down',
            'data' => [
                'service' => 'zhongyan-platform-backend',
                'version' => '0.1.0',
                'checks' => $checks,
                'timestamp' => now()->toIso8601String(),
            ],
        ], $allHealthy ? 200 : 503);
    }

    private function checkMysql(): array
    {
        try {
            DB::select('SELECT 1');
            return ['ok' => true, 'latency_ms' => null];
        } catch (\Throwable $e) {
            return ['ok' => false, 'error' => $e->getMessage()];
        }
    }

    private function checkRedis(): array
    {
        try {
            Redis::ping();
            return ['ok' => true];
        } catch (\Throwable $e) {
            return ['ok' => false, 'error' => $e->getMessage()];
        }
    }

    private function checkAiService(): array
    {
        try {
            $url = config('services.ai.url', env('AI_SERVICE_URL', 'http://127.0.0.1:8001'));
            $response = Http::timeout(3)->get($url.'/ai/v1/health');
            return [
                'ok' => $response->successful(),
                'status' => $response->status(),
                'remote' => $response->json('data.service') ?? null,
            ];
        } catch (\Throwable $e) {
            return ['ok' => false, 'error' => $e->getMessage()];
        }
    }
}
