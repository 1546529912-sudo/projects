<?php
declare(strict_types=1);

namespace app\controller;

use app\service\WmsConfigService;
use think\Request;
use think\Response;

/**
 * WMS 配置（iter-32 C）
 *   - GET  /admin/config/<key>
 *   - POST /admin/config/<key>     body: { value, description? }
 *   - GET  /admin/config/location-weights/preview  默认值 + 当前生效值（方便 Vue 渲染表单）
 */
class WmsConfig
{
    private WmsConfigService $svc;
    public function __construct() { $this->svc = new WmsConfigService(); }

    public function get(string $key): Response
    {
        $value = $this->svc->get($key);
        return $this->ok(['key' => $key, 'value' => $value]);
    }

    public function set(Request $request, string $key): Response
    {
        $value = $request->param('value');
        $desc = $request->param('description');
        if ($value === null) return $this->err(400, 'value 必传');
        $operator = $request->admin['username'] ?? 'admin';
        $row = $this->svc->set($key, $value, $desc, $operator);
        return $this->ok($row);
    }

    public function locationWeightsPreview(Request $request): Response
    {
        return $this->ok([
            'defaults' => WmsConfigService::DEFAULT_LOCATION_WEIGHTS,
            'effective' => $this->svc->getLocationWeights(),
            'key' => WmsConfigService::KEY_LOCATION_RECOMMEND_WEIGHTS,
        ]);
    }

    private function ok(mixed $data): Response { return json(['code' => 0, 'msg' => 'ok', 'data' => $data]); }
    private function err(int $code, string $msg): Response { return json(['code' => $code, 'msg' => $msg, 'data' => null]); }
}
