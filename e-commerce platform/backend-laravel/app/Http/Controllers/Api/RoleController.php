<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * 角色切换 · TRADE-001-06
 */
class RoleController extends Controller
{
    // POST /api/v1/users/role/switch
    public function switch(Request $request): JsonResponse
    {
        $data = $request->validate([
            'role' => 'required|in:individual,enterprise',
        ]);

        $user = $request->user();

        if ($data['role'] === 'enterprise' && $user->role !== 'enterprise') {
            return response()->json([
                'code' => 1110,
                'message' => '请先完成企业认证',
                'data' => null,
            ], 403);
        }

        $user->update(['active_role' => $data['role']]);

        return response()->json([
            'code' => 0,
            'message' => 'ok',
            'data' => ['active_role' => $user->active_role],
        ]);
    }
}
