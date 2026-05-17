<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class HealthController extends Controller
{
    public function check(): JsonResponse
    {
        $checks = [
            'status' => 'healthy',
            'timestamp' => now()->toISOString(),
            'version' => '0.1.0',
        ];

        try {
            DB::connection()->getPdo();
            $checks['database'] = 'connected';
        } catch (\Exception $e) {
            $checks['database'] = 'disconnected';
            $checks['status'] = 'degraded';
        }

        return response()->json([
            'code' => 0,
            'message' => 'ok',
            'data' => $checks,
        ]);
    }
}
