<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\SmsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Redis;
use Illuminate\Validation\ValidationException;

/**
 * 认证 Controller · 对应 TRADE-001-01/02/03
 *
 * Stub 实现，详见 outputs/product/task-spec.md 判定项。
 */
class AuthController extends Controller
{
    public function __construct(private SmsService $sms) {}

    // POST /api/v1/auth/sms/send · TRADE-001-01 判定项 1, 2, 5
    public function sendSmsCode(Request $request): JsonResponse
    {
        $request->validate(['phone' => 'required|regex:/^1[3-9]\d{9}$/']);

        $phone = $request->input('phone');
        $cooldownKey = "sms:cooldown:{$phone}";
        $codeKey = "sms:code:{$phone}";
        $lockKey = "sms:lock:{$phone}";

        if (Redis::exists($lockKey)) {
            return $this->fail(1004, '验证码错误次数过多，请稍后再试', 429);
        }

        if (Redis::exists($cooldownKey)) {
            return $this->fail(1005, '请稍候再试', 429);
        }

        $code = (string) random_int(100000, 999999);
        Redis::setex($codeKey, 300, $code); // 5 分钟
        Redis::setex($cooldownKey, 60, 1);  // 60 秒冷却

        $this->sms->send($phone, $code);

        return $this->ok(['message' => 'sent']);
    }

    // POST /api/v1/auth/register · TRADE-001-01 判定项 3, 4
    public function register(Request $request): JsonResponse
    {
        $data = $request->validate([
            'phone' => 'required|regex:/^1[3-9]\d{9}$/',
            'code' => 'required|digits:6',
            'password' => 'nullable|min:8',
        ]);

        if (! $this->verifyCode($data['phone'], $data['code'])) {
            return $this->fail(1002, '验证码错误或过期', 422);
        }

        if (User::where('phone', $data['phone'])->exists()) {
            return $this->fail(1003, '该号码已注册', 422);
        }

        $user = User::create([
            'phone' => $data['phone'],
            'password' => isset($data['password']) ? Hash::make($data['password']) : null,
            'role' => 'individual',
            'active_role' => 'individual',
            'status' => 'active',
        ]);

        $deviceLabel = $this->deviceLabel($request);
        $token = $user->createToken($deviceLabel)->plainTextToken;
        $this->notifyIfNewDevice($user, $deviceLabel, $request, true); // 注册必属新设备

        return $this->ok([
            'user' => ['id' => $user->id, 'phone' => $this->maskPhone($user->phone), 'role' => $user->role],
            'access_token' => $token,
            'expires_in' => 7200,
        ]);
    }

    // POST /api/v1/auth/login · TRADE-001-03
    public function login(Request $request): JsonResponse
    {
        $data = $request->validate([
            'phone' => 'required|regex:/^1[3-9]\d{9}$/',
            'password' => 'nullable|string',
            'code' => 'nullable|digits:6',
        ]);

        $user = User::where('phone', $data['phone'])->first();

        if (! $user || $user->status !== 'active') {
            return $this->fail(1006, '账号或密码错误', 401);
        }

        $passwordOk = isset($data['password']) && $user->password && Hash::check($data['password'], $user->password);
        $codeOk = isset($data['code']) && $this->verifyCode($data['phone'], $data['code']);

        if (! $passwordOk && ! $codeOk) {
            return $this->fail(1006, '账号或密码错误', 401);
        }

        $user->update(['last_login_at' => now(), 'last_login_ip' => $request->ip()]);
        $deviceLabel = $this->deviceLabel($request);
        $isNewDevice = $user->tokens()->where('name', $deviceLabel)->doesntExist();
        $token = $user->createToken($deviceLabel)->plainTextToken;
        $this->notifyIfNewDevice($user, $deviceLabel, $request, $isNewDevice);

        return $this->ok([
            'user' => ['id' => $user->id, 'phone' => $this->maskPhone($user->phone), 'role' => $user->role],
            'access_token' => $token,
            'expires_in' => 7200,
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();
        return $this->ok(['message' => 'logged out']);
    }

    /**
     * POST /api/v1/auth/refresh · iter-18
     * 用当前未过期 token 换一个新 token（旧的立刻 revoke）。
     * 过期了的 token 已经被 sanctum 401 挡住，到不了这儿 → 必须重新登录。
     */
    public function refresh(Request $request): JsonResponse
    {
        $user = $request->user();
        // 保留旧 token 的 device 名（refresh 不算新设备）
        $deviceName = $request->user()->currentAccessToken()->name ?? $this->deviceLabel($request);
        $request->user()->currentAccessToken()->delete();
        $token = $user->createToken($deviceName)->plainTextToken;

        return $this->ok([
            'access_token' => $token,
            'expires_in' => (int) (config('sanctum.expiration') ?? 120) * 60,
        ]);
    }

    // POST /api/v1/auth/wechat/callback · TRADE-001-02
    // 真实接入: 用 code 调微信 jscode2session API 获 openid/unionid
    public function wechatCallback(Request $request): JsonResponse
    {
        $data = $request->validate([
            'code' => 'required|string',
            'mock_openid' => 'sometimes|string', // 测试 / 本地走 mock
        ]);

        $openid = $data['mock_openid'] ?? 'wx_'.substr(hash('sha256', $data['code']), 0, 32);

        $user = User::firstOrCreate(
            ['wechat_openid' => $openid],
            [
                'role' => 'individual',
                'active_role' => 'individual',
                'status' => 'active',
                'name' => '微信用户',
            ],
        );

        $user->update(['last_login_at' => now(), 'last_login_ip' => $request->ip()]);
        $deviceLabel = $this->deviceLabel($request);
        $isNewDevice = $user->tokens()->where('name', $deviceLabel)->doesntExist();
        $token = $user->createToken($deviceLabel)->plainTextToken;
        $this->notifyIfNewDevice($user, $deviceLabel, $request, $isNewDevice);

        return $this->ok([
            'user' => [
                'id' => $user->id,
                'phone' => $this->maskPhone($user->phone),
                'role' => $user->role,
                'name' => $user->name,
            ],
            'access_token' => $token,
            'expires_in' => 7200,
            'need_bind_phone' => ! $user->phone,
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user();
        $company = \App\Models\Company::where('user_id', $user->id)->latest()->first();

        return $this->ok([
            'id' => $user->id,
            'phone' => $this->maskPhone($user->phone),
            'name' => $user->name,
            'role' => $user->role,
            'active_role' => $user->active_role,
            'company' => $company ? [
                'id' => $company->id,
                'name' => $company->name,
                'status' => $company->status,
                'reject_reason' => $company->reject_reason,
            ] : null,
        ]);
    }

    /**
     * iter-24 · 新设备登录 → 异步 Webhook 推送（auth.new_device 事件）
     * 复用 iter-17 DispatchWebhookJob：tries=3 + backoff[10,30,60]，失败不阻塞登录
     */
    private function notifyIfNewDevice(User $user, string $deviceLabel, Request $request, bool $isNewDevice): void
    {
        if (! $isNewDevice) return;
        \App\Jobs\DispatchWebhookJob::dispatch('auth.new_device', [
            'user_id' => $user->id,
            'phone' => $this->maskPhone($user->phone),
            'device_label' => $deviceLabel,
            'ip' => $request->ip(),
            'user_agent' => substr((string) $request->userAgent(), 0, 200),
            'login_at' => now()->toIso8601String(),
        ]);
    }

    /**
     * iter-23 · GET /api/v1/auth/devices — 列出当前用户的所有登录设备
     */
    public function devices(Request $request): JsonResponse
    {
        $currentId = $request->user()->currentAccessToken()->id ?? null;
        $tokens = $request->user()->tokens()->latest()->get();

        $items = $tokens->map(fn ($t) => [
            'id' => $t->id,
            'name' => $t->name,
            'created_at' => $t->created_at?->toIso8601String(),
            'last_used_at' => $t->last_used_at?->toIso8601String(),
            'is_current' => $t->id === $currentId,
        ])->values();

        return $this->ok(['devices' => $items, 'total' => $items->count()]);
    }

    /**
     * iter-23 · DELETE /api/v1/auth/devices/{id} — 撤销指定设备
     * 限本人 token；删 current 等于 logout 当前会话。
     */
    public function revokeDevice(Request $request, int $id): JsonResponse
    {
        $token = $request->user()->tokens()->where('id', $id)->first();
        if (! $token) return $this->fail(1007, '设备不存在或已下线', 404);
        $token->delete();
        return $this->ok(['revoked' => $id]);
    }

    /**
     * iter-23 · POST /api/v1/auth/logout-others — 登出除当前外的所有设备
     */
    public function logoutOthers(Request $request): JsonResponse
    {
        $currentId = $request->user()->currentAccessToken()->id ?? null;
        $count = $request->user()->tokens()->where('id', '!=', $currentId)->delete();
        return $this->ok(['revoked' => $count]);
    }

    /**
     * 根据 UA + IP 生成可读设备标识，最长 60 字符（personal_access_tokens.name 是 string(255)，但短点更好读）
     */
    private function deviceLabel(Request $request): string
    {
        $ua = (string) $request->userAgent();
        $browser = $this->detectBrowser($ua);
        $os = $this->detectOS($ua);
        $ip = $request->ip() ?: '?';
        $label = trim("{$browser} · {$os} · {$ip}", ' ·');
        return mb_substr($label ?: 'API · '.$ip, 0, 60);
    }

    private function detectBrowser(string $ua): string
    {
        if (str_contains($ua, 'Edg/')) return 'Edge';
        if (str_contains($ua, 'Chrome/') && ! str_contains($ua, 'Edg/')) return 'Chrome';
        if (str_contains($ua, 'Firefox/')) return 'Firefox';
        if (str_contains($ua, 'Safari/') && ! str_contains($ua, 'Chrome/')) return 'Safari';
        if (str_contains($ua, 'curl/')) return 'curl';
        if (str_contains($ua, 'PostmanRuntime')) return 'Postman';
        return $ua ? '其他' : 'API';
    }

    private function detectOS(string $ua): string
    {
        if (str_contains($ua, 'Windows')) return 'Windows';
        if (str_contains($ua, 'Mac OS') || str_contains($ua, 'Macintosh')) return 'macOS';
        if (str_contains($ua, 'iPhone')) return 'iPhone';
        if (str_contains($ua, 'iPad')) return 'iPad';
        if (str_contains($ua, 'Android')) return 'Android';
        if (str_contains($ua, 'Linux')) return 'Linux';
        return '';
    }

    private function verifyCode(string $phone, string $code): bool
    {
        $stored = Redis::get("sms:code:{$phone}");
        return $stored !== null && hash_equals((string) $stored, $code);
    }

    private function maskPhone(?string $phone): ?string
    {
        if (! $phone || strlen($phone) < 11) return $phone;
        return substr($phone, 0, 3).'****'.substr($phone, -4);
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
