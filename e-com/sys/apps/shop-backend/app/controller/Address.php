<?php
declare(strict_types=1);

namespace app\controller;

use app\service\AddressService;
use think\Request;
use think\Response;

/**
 * 地址簿（iter-20）
 *   GET    /address/list
 *   POST   /address
 *   PUT    /address/:id
 *   DELETE /address/:id
 *   POST   /address/:id/default
 */
class Address
{
    private AddressService $svc;
    public function __construct() { $this->svc = new AddressService(); }

    public function list(Request $request): Response
    {
        $uid = (int)($request->user_id ?? 0);
        return $this->ok($this->svc->list($uid));
    }

    public function create(Request $request): Response
    {
        $uid = (int)($request->user_id ?? 0);
        try {
            $row = $this->svc->create($uid, $request->only(['name', 'phone', 'province', 'city', 'district', 'detail', 'lat', 'lng']));
            return $this->ok($row);
        } catch (\Throwable $e) { return $this->err(400, $e->getMessage()); }
    }

    public function update(Request $request, int $id): Response
    {
        $uid = (int)($request->user_id ?? 0);
        try {
            $row = $this->svc->update($uid, $id, $request->only(['name', 'phone', 'province', 'city', 'district', 'detail', 'lat', 'lng']));
            return $this->ok($row);
        } catch (\Throwable $e) { return $this->err(400, $e->getMessage()); }
    }

    public function delete(Request $request, int $id): Response
    {
        $uid = (int)($request->user_id ?? 0);
        try {
            $this->svc->delete($uid, $id);
            return $this->ok(['id' => $id]);
        } catch (\Throwable $e) { return $this->err(400, $e->getMessage()); }
    }

    public function setDefault(Request $request, int $id): Response
    {
        $uid = (int)($request->user_id ?? 0);
        try {
            $row = $this->svc->setDefault($uid, $id);
            return $this->ok($row);
        } catch (\Throwable $e) { return $this->err(400, $e->getMessage()); }
    }

    private function ok(mixed $data): Response { return json(['code' => 0, 'msg' => 'ok', 'data' => $data]); }
    private function err(int $code, string $msg): Response { return json(['code' => $code, 'msg' => $msg, 'data' => null]); }
}
