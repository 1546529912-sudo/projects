<?php
declare(strict_types=1);

namespace app\controller;

use app\service\StoreService;
use think\Request;
use think\Response;

/**
 * 店铺管理 controller（iter-35 BIZ-08-1）
 *
 *   全部 super_admin 独占（在 route group 上限制）
 */
class Store
{
    private StoreService $svc;
    public function __construct() { $this->svc = new StoreService(); }

    public function list(Request $request): Response
    {
        $filters = $request->only(['status', 'keyword']);
        return $this->ok($this->svc->list($filters,
            max(1, (int)$request->param('page', 1)),
            max(1, min(100, (int)$request->param('size', 20)))));
    }

    public function detail(int $id): Response
    {
        try { return $this->ok($this->svc->detail($id)); }
        catch (\Throwable $e) { return $this->err(404, $e->getMessage()); }
    }

    public function create(Request $request): Response
    {
        try {
            $op = $request->admin['username'] ?? 'admin';
            $data = $request->only(['code', 'name', 'description', 'logo_url', 'contact_name', 'contact_phone', 'business_license', 'commission_rate']);
            return $this->ok($this->svc->create($data, $op));
        } catch (\Throwable $e) { return $this->err(400, $e->getMessage()); }
    }

    public function approve(Request $request, int $id): Response
    {
        try {
            $op = $request->admin['username'] ?? 'admin';
            $opts = [];
            if ($pwd = trim((string)$request->param('default_password', ''))) {
                $opts['default_password'] = $pwd;
            }
            return $this->ok($this->svc->approve($id, $op, $opts));
        } catch (\Throwable $e) { return $this->err(400, $e->getMessage()); }
    }

    public function suspend(Request $request, int $id): Response
    {
        try {
            $op = $request->admin['username'] ?? 'admin';
            $reason = (string)$request->param('reason');
            return $this->ok($this->svc->suspend($id, $reason, $op));
        } catch (\Throwable $e) { return $this->err(400, $e->getMessage()); }
    }

    public function resume(Request $request, int $id): Response
    {
        try {
            $op = $request->admin['username'] ?? 'admin';
            return $this->ok($this->svc->resume($id, $op));
        } catch (\Throwable $e) { return $this->err(400, $e->getMessage()); }
    }

    /**
     * iter-39 BIZ-08-5 店主自管：仅本店 + 仅可改 name/description/logo/contact
     */
    public function selfUpdate(Request $request): Response
    {
        try {
            $op = $request->admin['username'] ?? 'admin';
            $storeIds = $request->store_ids ?? null;
            if ($storeIds === null) return $this->err(400, '此接口仅 store_owner 使用');
            if (!$storeIds) return $this->err(400, '当前账号未关联店铺');
            if (count($storeIds) !== 1) return $this->err(400, '多店关联请用 store/<id>');
            $data = $request->only(['name', 'description', 'logo_url', 'contact_name', 'contact_phone']);
            return $this->ok($this->svc->selfUpdate($storeIds[0], $data, $op));
        } catch (\Throwable $e) { return $this->err(400, $e->getMessage()); }
    }

    public function updateCommission(Request $request, int $id): Response
    {
        try {
            $op = $request->admin['username'] ?? 'admin';
            $rate = (float)$request->param('commission_rate');
            return $this->ok($this->svc->updateCommission($id, $rate, $op));
        } catch (\Throwable $e) { return $this->err(400, $e->getMessage()); }
    }

    public function addAdmin(Request $request, int $id): Response
    {
        try {
            $op = $request->admin['username'] ?? 'admin';
            $adminUserId = (int)$request->param('admin_user_id');
            $role = (string)$request->param('role', 'store_owner');
            return $this->ok($this->svc->addAdmin($id, $adminUserId, $role, $op));
        } catch (\Throwable $e) { return $this->err(400, $e->getMessage()); }
    }

    public function removeAdmin(Request $request, int $id, int $adminUserId): Response
    {
        try {
            $op = $request->admin['username'] ?? 'admin';
            return $this->ok($this->svc->removeAdmin($id, $adminUserId, $op));
        } catch (\Throwable $e) { return $this->err(400, $e->getMessage()); }
    }

    /**
     * iter-62 Q39-01 商家自助入驻（小程序用，无鉴权）
     *   节流：单手机 24h 内 1 单；状态 pending；后续 super 进 /admin/store/<id>/approve
     */
    public function publicApply(Request $request): Response
    {
        $data = $request->only(['code', 'name', 'description', 'logo_url', 'contact_name', 'contact_phone', 'business_license']);
        foreach (['code', 'name', 'contact_name', 'contact_phone', 'business_license'] as $f) {
            if (empty($data[$f])) return $this->err(400, "{$f} 必填");
        }
        if (!preg_match('/^[a-z][a-z0-9\-]{2,30}$/', (string)$data['code'])) {
            return $this->err(400, 'code 格式：小写字母开头，限字母数字-，3-30 位');
        }
        if (!preg_match('/^1[3-9]\d{9}$/', (string)$data['contact_phone'])) {
            return $this->err(400, '手机号格式错误');
        }
        // 24h 内同手机限 1 单
        $dup = \think\facade\Db::name('stores')
            ->where('contact_phone', $data['contact_phone'])
            ->where('created_at', '>=', date('Y-m-d H:i:s', strtotime('-24 hours')))
            ->whereNull('deleted_at')->find();
        if ($dup) return $this->err(429, '该手机号 24 小时内已申请，请等待审核');
        try {
            // 入驻者默认 5% 抽佣（运营审批时可改）
            $data['commission_rate'] = 0.05;
            return $this->ok($this->svc->create($data, 'self-apply:' . $data['contact_phone']));
        } catch (\Throwable $e) { return $this->err(400, $e->getMessage()); }
    }

    /**
     * iter-39 BIZ-08-5 公开店铺信息（小程序店铺主页用，无需鉴权）
     */
    public function publicDetail(string $code): Response
    {
        // iter-39: 支持 code 或数字 id 查询（小程序按 spu.store_id 数字传入）
        $q = \think\facade\Db::name('stores')
            ->whereNull('deleted_at')->where('status', 'approved')
            ->field('id, code, name, logo_url, description, contact_phone, created_at');
        if (ctype_digit($code)) $q->where('id', (int)$code);
        else $q->where('code', $code);
        $row = $q->find();
        if (!$row) return $this->err(404, '店铺不存在或未通过审核');
        return $this->ok($row);
    }

    // iter-72 Q35-01/Q39-02 店铺装修公开读
    public function publicPage(Request $request, int $storeId): Response
    {
        $type = (string)$request->param('page_type', 'home');
        $row = (new \app\service\StorePageService())->publicRead($storeId, $type);
        if (!$row) return $this->err(404, '页面未发布');
        return $this->ok($row);
    }

    private function ok(mixed $data): Response { return json(['code' => 0, 'msg' => 'ok', 'data' => $data]); }
    private function err(int $code, string $msg): Response { return json(['code' => $code, 'msg' => $msg, 'data' => null]); }
}
