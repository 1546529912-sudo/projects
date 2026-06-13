<?php
declare(strict_types=1);

namespace app\controller;

use app\service\BannerService;
use think\Request;
use think\Response;

/**
 * Banner + 推荐位 controller（iter-40 BIZ-09-1）
 *   admin 路由：/admin/banner/* + /admin/featured/*
 *   公开路由：/banner/list?position= + /featured/list?position=
 */
class Banner
{
    private BannerService $svc;
    public function __construct() { $this->svc = new BannerService(); }

    /* ============= Banner admin ============= */

    public function adminListBanner(Request $request): Response
    {
        $filters = $request->only(['position', 'status', 'store_id']);
        return $this->ok($this->svc->listBanners($filters,
            max(1, (int)$request->param('page', 1)),
            max(1, min(100, (int)$request->param('size', 20)))));
    }

    public function adminCreateBanner(Request $request): Response
    {
        try {
            $op = $request->admin['username'] ?? 'admin';
            return $this->ok($this->svc->createBanner(
                $request->only(['code', 'name', 'position', 'image_url', 'link_type', 'link_value', 'sort', 'status', 'valid_from', 'valid_to', 'store_id']),
                $op
            ));
        } catch (\Throwable $e) { return $this->err(400, $e->getMessage()); }
    }

    public function adminUpdateBanner(Request $request, int $id): Response
    {
        try {
            $op = $request->admin['username'] ?? 'admin';
            return $this->ok($this->svc->updateBanner($id,
                $request->only(['name', 'image_url', 'link_type', 'link_value', 'sort', 'status', 'valid_from', 'valid_to', 'position']),
                $op
            ));
        } catch (\Throwable $e) { return $this->err(400, $e->getMessage()); }
    }

    public function adminDeleteBanner(Request $request, int $id): Response
    {
        try {
            $op = $request->admin['username'] ?? 'admin';
            $this->svc->deleteBanner($id, $op);
            return $this->ok(['id' => $id]);
        } catch (\Throwable $e) { return $this->err(400, $e->getMessage()); }
    }

    /* ============= Featured admin ============= */

    public function adminListFeatured(Request $request): Response
    {
        $filters = $request->only(['position', 'status', 'spu_id']);
        return $this->ok($this->svc->listFeatured($filters,
            max(1, (int)$request->param('page', 1)),
            max(1, min(100, (int)$request->param('size', 20)))));
    }

    public function adminCreateFeatured(Request $request): Response
    {
        try {
            $op = $request->admin['username'] ?? 'admin';
            return $this->ok($this->svc->createFeatured(
                $request->only(['position', 'spu_id', 'sort', 'status', 'valid_from', 'valid_to', 'store_id']),
                $op
            ));
        } catch (\Throwable $e) { return $this->err(400, $e->getMessage()); }
    }

    public function adminUpdateFeatured(Request $request, int $id): Response
    {
        try {
            $op = $request->admin['username'] ?? 'admin';
            return $this->ok($this->svc->updateFeatured($id,
                $request->only(['position', 'sort', 'status', 'valid_from', 'valid_to']),
                $op
            ));
        } catch (\Throwable $e) { return $this->err(400, $e->getMessage()); }
    }

    public function adminDeleteFeatured(Request $request, int $id): Response
    {
        try {
            $op = $request->admin['username'] ?? 'admin';
            $this->svc->deleteFeatured($id, $op);
            return $this->ok(['id' => $id]);
        } catch (\Throwable $e) { return $this->err(400, $e->getMessage()); }
    }

    /* ============= 公开读 ============= */

    public function publicListBanner(Request $request): Response
    {
        $position = (string)$request->param('position', 'home');
        // iter-60 Q40-02 接受 store_id：null=仅平台；>0=该店+平台
        $storeRaw = $request->param('store_id');
        $storeId = $storeRaw !== null && $storeRaw !== '' && ctype_digit((string)$storeRaw) ? (int)$storeRaw : null;
        return $this->ok(['list' => $this->svc->publicListBanners($position, $storeId)]);
    }

    public function publicListFeatured(Request $request): Response
    {
        $position = (string)$request->param('position', 'home_hot');
        $limit = max(1, min(50, (int)$request->param('limit', 20)));
        // iter-60 Q40-03 接受 user_id 个性化
        $uidRaw = $request->param('user_id');
        $userId = $uidRaw !== null && $uidRaw !== '' && ctype_digit((string)$uidRaw) ? (int)$uidRaw : null;
        return $this->ok(['list' => $this->svc->publicListFeatured($position, $limit, $userId)]);
    }

    private function ok(mixed $data): Response { return json(['code' => 0, 'msg' => 'ok', 'data' => $data]); }
    private function err(int $code, string $msg): Response { return json(['code' => $code, 'msg' => $msg, 'data' => null]); }
}
