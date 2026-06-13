<?php
declare(strict_types=1);

namespace app\service;

use think\facade\Db;
use think\facade\Request;

/**
 * 后台审计日志（iter-15）
 *
 * 调用方式（admin 控制器）：
 *   AuditService::log('refund.approve', 'refund', $refundNo, $beforeArr, $afterArr, $reason);
 *
 * 失败不阻塞业务：自动 try/catch，仅 error_log。
 */
class AuditService
{
    public static function log(
        string $action,
        string $targetType,
        string $targetId,
        ?array $before = null,
        ?array $after = null,
        ?string $reason = null,
        ?string $operator = null
    ): void {
        try {
            $req = Request::instance();
            $op = $operator ?: (string)$req->param('operator', 'admin');
            $ip = (string)($req->ip() ?: '');
            $traceId = (string)$req->header('X-Trace-Id', '');

            Db::name('admin_audit_log')->insert([
                'operator' => $op,
                'action' => $action,
                'target_type' => $targetType,
                'target_id' => $targetId,
                'before' => $before !== null ? json_encode($before, JSON_UNESCAPED_UNICODE) : null,
                'after' => $after !== null ? json_encode($after, JSON_UNESCAPED_UNICODE) : null,
                'reason' => $reason ?: null,
                'ip' => $ip ?: null,
                'trace_id' => $traceId ?: null,
            ]);
        } catch (\Throwable $e) {
            error_log("[AuditService] log 失败 action={$action} target={$targetType}/{$targetId} err=" . $e->getMessage());
        }
    }
}
