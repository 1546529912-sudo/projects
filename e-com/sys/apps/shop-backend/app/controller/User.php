<?php
declare(strict_types=1);

namespace app\controller;

use app\service\JwtService;
use app\service\SmsService;
use think\facade\Db;
use think\Request;
use think\Response;

class User
{
    public function __construct(
        private SmsService $sms = new SmsService(),
        private JwtService $jwt = new JwtService(),
    ) {}

    public function sendCode(Request $request): Response
    {
        $phone = trim((string)$request->param('phone'));
        try {
            $code = $this->sms->sendCode($phone, 'login', $request->ip());
            // dev 模式：直接返回明文，方便联调
            return json(['code' => 0, 'msg' => 'ok', 'data' => ['code' => $code, 'note' => 'dev 模式返回明文']]);
        } catch (\InvalidArgumentException $e) {
            return json(['code' => 400, 'msg' => $e->getMessage(), 'data' => null]);
        }
    }

    public function login(Request $request): Response
    {
        $phone = trim((string)$request->param('phone'));
        $code = trim((string)$request->param('code'));
        if (!$phone || !$code) {
            return json(['code' => 400, 'msg' => 'phone/code 必传', 'data' => null]);
        }
        if (!$this->sms->verifyCode($phone, $code, 'login')) {
            return json(['code' => 400, 'msg' => '验证码错误或过期', 'data' => null]);
        }

        $user = Db::name('users')->where('phone', $phone)->find();
        $isNew = false;
        if (!$user) {
            $uid = Db::name('users')->insertGetId([
                'phone' => $phone,
                'nickname' => '用户' . substr($phone, -4),
                'status' => 'active',
                'last_login_at' => date('Y-m-d H:i:s'),
                'last_address_snapshot' => json_encode([
                    'name' => '默认收货人',
                    'phone' => $phone,
                    'province' => '广东省',
                    'city' => '深圳市',
                    'district' => '南山区',
                    'detail' => '科技园（默认地址）',
                ], JSON_UNESCAPED_UNICODE),
            ]);
            $isNew = true;
        } else {
            $uid = (int)$user['id'];
            Db::name('users')->where('id', $uid)->update(['last_login_at' => date('Y-m-d H:i:s')]);
        }
        // iter-27 Q19-02: 首次注册 → OMS 触发新人券
        if ($isNew) {
            $this->triggerAutoGrant('user_register', (int)$uid);
        }

        $token = $this->jwt->sign($uid, ['phone' => $phone]);
        $userOut = Db::name('users')->where('id', $uid)->find();
        $userOut['last_address_snapshot'] = json_decode($userOut['last_address_snapshot'] ?? '[]', true);
        return json(['code' => 0, 'msg' => 'ok', 'data' => ['token' => $token, 'user' => $userOut]]);
    }

    public function logout(): Response
    {
        // 无状态 JWT：客户端丢弃 token 即可；服务端无需 blacklist（M2 加 redis 黑名单）
        return json(['code' => 0, 'msg' => 'ok', 'data' => null]);
    }

    public function me(Request $request): Response
    {
        $uid = (int)($request->user_id ?? 0);
        $user = Db::name('users')->where('id', $uid)->find();
        if (!$user) return json(['code' => 404, 'msg' => '用户不存在', 'data' => null]);
        $user['last_address_snapshot'] = json_decode($user['last_address_snapshot'] ?? '[]', true);
        return json(['code' => 0, 'msg' => 'ok', 'data' => $user]);
    }

    /**
     * iter-27 Q19-02: 调 OMS infra 接口 /coupon/auto-grant
     *   失败不阻塞登录主流程（try/catch silent）
     */
    private function triggerAutoGrant(string $triggerType, int $userId): void
    {
        try {
            $omsUrl = env('OMS_BACKEND_URL', 'http://oms-backend');
            $client = new \GuzzleHttp\Client(['timeout' => 2.0]);
            $client->post($omsUrl . '/api/v1/coupon/auto-grant', [
                'json' => ['trigger_type' => $triggerType, 'user_id' => $userId],
            ]);
        } catch (\Throwable $e) { /* silent */ }
    }
}
