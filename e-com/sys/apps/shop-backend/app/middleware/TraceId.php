<?php
declare(strict_types=1);

namespace app\middleware;

use Closure;
use think\Request;
use think\Response;

/**
 * 注入 X-Trace-Id，跨服务调用时透传
 */
class TraceId
{
    public function handle(Request $request, Closure $next): Response
    {
        $traceId = $request->header('X-Trace-Id');
        if (empty($traceId)) {
            $traceId = uniqid('trace-', true);
            $request->withHeader(['X-Trace-Id' => $traceId]);
        }

        /** @var Response $response */
        $response = $next($request);
        $response->header(['X-Trace-Id' => $traceId]);

        return $response;
    }
}
