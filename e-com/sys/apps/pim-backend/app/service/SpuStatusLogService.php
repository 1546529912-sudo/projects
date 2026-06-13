<?php
declare(strict_types=1);

namespace app\service;

use think\facade\Db;
use think\facade\Request;

/**
 * SPU 状态机日志（iter-29 P1-b）
 *
 * 状态轨迹专用：create/publish/offline/delete 时各写一条。
 * 失败不阻塞业务。
 */
class SpuStatusLogService
{
    public static function log(int $spuId, ?string $from, string $to, ?string $reason = null, ?string $operator = null): void
    {
        try {
            $req = Request::instance();
            $op = $operator ?: (string)($req->admin['username'] ?? $req->admin['sub'] ?? 'admin');
            Db::name('spu_status_log')->insert([
                'spu_id' => $spuId,
                'from_status' => $from,
                'to_status' => $to,
                'operator' => $op,
                'reason' => $reason ?: null,
            ]);
        } catch (\Throwable $e) {
            error_log("[SpuStatusLogService] log 失败 spu={$spuId} {$from}->{$to} err=" . $e->getMessage());
        }
    }
}
