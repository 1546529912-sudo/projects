<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Local dev uses `php artisan serve` (single process). Default max_execution_time (often 30s)
 * during a long DeepSeek call causes a fatal error and terminates the entire server, so the
 * browser sees ERR_CONNECTION_REFUSED until `artisan serve` is restarted.
 */
class ExtendRequestTimeBudgetForAi
{
    public function handle(Request $request, Closure $next): Response
    {
        set_time_limit(220);

        return $next($request);
    }
}
