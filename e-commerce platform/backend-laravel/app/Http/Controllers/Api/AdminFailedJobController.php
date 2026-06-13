<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;

/**
 * 死信队列后台 · iter-19
 *
 * - GET    /api/v1/admin/failed-jobs        列表（最新在前）
 * - POST   /api/v1/admin/failed-jobs/{uuid}/retry  重试
 * - DELETE /api/v1/admin/failed-jobs/{uuid}        删除单条
 * - POST   /api/v1/admin/failed-jobs/clear          清空所有
 * - GET    /api/v1/admin/failed-jobs/stats          计数（Dashboard 用）
 *
 * 表 failed_jobs 由 Laravel 默认 migration 创建（jobs_table）。
 */
class AdminFailedJobController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $perPage = max(1, min(200, (int) $request->input('per_page', 20)));
        $page = max(1, (int) $request->input('page', 1));
        $keyword = trim((string) $request->input('keyword', ''));

        $q = DB::table('failed_jobs')->orderByDesc('failed_at');
        if ($keyword !== '') {
            // 在 payload (含 displayName/job_class) 和 exception 里搜
            $q->where(function ($qq) use ($keyword) {
                $qq->where('payload', 'like', "%{$keyword}%")
                   ->orWhere('exception', 'like', "%{$keyword}%")
                   ->orWhere('queue', 'like', "%{$keyword}%");
            });
        }

        $total = (clone $q)->count();
        $rows = $q->forPage($page, $perPage)->get();
        $items = $rows->map(fn ($r) => $this->toJson($r))->all();

        return $this->ok([
            'items' => $items,
            'total' => $total,
            'page' => $page,
            'per_page' => $perPage,
            'last_page' => (int) max(1, ceil($total / $perPage)),
        ]);
    }

    public function retry(string $uuid): JsonResponse
    {
        if (! DB::table('failed_jobs')->where('uuid', $uuid)->exists()) {
            return $this->fail(1801, '失败作业不存在', 404);
        }
        // Laravel 内建命令：把 uuid 标的失败作业重新入队，并从 failed_jobs 删除
        Artisan::call('queue:retry', ['id' => [$uuid]]);
        return $this->ok(['retried' => $uuid]);
    }

    public function destroy(string $uuid): JsonResponse
    {
        $deleted = DB::table('failed_jobs')->where('uuid', $uuid)->delete();
        if (! $deleted) return $this->fail(1801, '失败作业不存在', 404);
        return $this->ok(['deleted' => $uuid]);
    }

    public function clear(): JsonResponse
    {
        $count = DB::table('failed_jobs')->count();
        DB::table('failed_jobs')->delete();
        return $this->ok(['cleared' => $count]);
    }

    public function stats(): JsonResponse
    {
        return $this->ok([
            'count' => DB::table('failed_jobs')->count(),
            'oldest_at' => DB::table('failed_jobs')->min('failed_at'),
            'latest_at' => DB::table('failed_jobs')->max('failed_at'),
        ]);
    }

    private function toJson(object $r): array
    {
        $payload = json_decode($r->payload ?? '{}', true) ?: [];
        return [
            'id' => $r->id,
            'uuid' => $r->uuid,
            'connection' => $r->connection,
            'queue' => $r->queue,
            'job_class' => $payload['displayName']
                ?? ($payload['data']['commandName'] ?? 'unknown'),
            'attempts' => $payload['attempts'] ?? null,
            'exception_excerpt' => $this->excerpt((string) ($r->exception ?? ''), 400),
            'failed_at' => $r->failed_at,
        ];
    }

    private function excerpt(string $text, int $len): string
    {
        $text = preg_replace('/\s+/', ' ', $text);
        return mb_strlen($text) > $len ? mb_substr($text, 0, $len).'…' : $text;
    }

    private function ok(array $data): JsonResponse
    {
        return response()->json(['code' => 0, 'message' => 'ok', 'data' => $data]);
    }

    private function fail(int $code, string $message, int $status = 400): JsonResponse
    {
        return response()->json(['code' => $code, 'message' => $message, 'data' => null], $status);
    }
}
