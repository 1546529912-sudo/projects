<?php
declare(strict_types=1);

namespace app\controller;

use GuzzleHttp\Client;
use think\facade\Db;
use think\Request;
use think\Response;

class Cart
{
    public function list(Request $request): Response
    {
        $uid = (int)($request->user_id ?? 0);
        $rows = Db::name('cart')->where('user_id', $uid)->order('id', 'desc')->select()->toArray();
        $skuCodes = array_column($rows, 'sku_code');
        $skuMap = $this->fetchSkus($skuCodes, (string)$request->header('X-Trace-Id', ''));

        $list = [];
        $totalAmount = 0;
        $selectedQty = 0;
        foreach ($rows as $r) {
            $sku = $skuMap[$r['sku_code']] ?? null;
            $available = $sku !== null && ($sku['status'] ?? '') === 'enabled';
            $price = (int)($sku['price'] ?? 0);
            $line = [
                'id' => (int)$r['id'],
                'sku_code' => $r['sku_code'],
                'qty' => (int)$r['qty'],
                'selected' => (bool)$r['selected'],
                'available' => $available,
                'sku' => $sku,
                'subtotal' => $price * (int)$r['qty'],
            ];
            if ($line['selected'] && $available) {
                $totalAmount += $line['subtotal'];
                $selectedQty += $line['qty'];
            }
            $list[] = $line;
        }

        return json([
            'code' => 0, 'msg' => 'ok',
            'data' => [
                'list' => $list,
                'total_amount' => $totalAmount,
                'total_amount_yuan' => number_format($totalAmount / 100, 2, '.', ''),
                'selected_qty' => $selectedQty,
            ],
        ]);
    }

    public function add(Request $request): Response
    {
        $uid = (int)($request->user_id ?? 0);
        $sku = trim((string)$request->param('sku_code'));
        $qty = max(1, (int)$request->param('qty', 1));
        if (!$sku) return json(['code' => 400, 'msg' => 'sku_code 必传', 'data' => null]);

        $exist = Db::name('cart')->where('user_id', $uid)->where('sku_code', $sku)->find();
        if ($exist) {
            Db::name('cart')->where('id', $exist['id'])->update(['qty' => (int)$exist['qty'] + $qty, 'selected' => 1]);
            $id = (int)$exist['id'];
        } else {
            $id = (int)Db::name('cart')->insertGetId([
                'user_id' => $uid, 'sku_code' => $sku, 'qty' => $qty, 'selected' => 1,
            ]);
        }
        return json(['code' => 0, 'msg' => 'ok', 'data' => ['id' => $id]]);
    }

    public function update(Request $request, int $id): Response
    {
        $uid = (int)($request->user_id ?? 0);
        $row = Db::name('cart')->where('id', $id)->where('user_id', $uid)->find();
        if (!$row) return json(['code' => 404, 'msg' => '记录不存在', 'data' => null]);
        $update = [];
        if ($request->has('qty')) $update['qty'] = max(1, (int)$request->param('qty'));
        if ($request->has('selected')) $update['selected'] = (int)(bool)$request->param('selected');
        if ($update) Db::name('cart')->where('id', $id)->update($update);
        return json(['code' => 0, 'msg' => 'ok', 'data' => null]);
    }

    public function delete(Request $request, int $id): Response
    {
        $uid = (int)($request->user_id ?? 0);
        Db::name('cart')->where('id', $id)->where('user_id', $uid)->delete();
        return json(['code' => 0, 'msg' => 'ok', 'data' => null]);
    }

    public function clearInvalid(Request $request): Response
    {
        $uid = (int)($request->user_id ?? 0);
        $rows = Db::name('cart')->where('user_id', $uid)->select()->toArray();
        $skus = array_column($rows, 'sku_code');
        $skuMap = $this->fetchSkus($skus, (string)$request->header('X-Trace-Id', ''));
        $invalidIds = [];
        foreach ($rows as $r) {
            $sku = $skuMap[$r['sku_code']] ?? null;
            if (!$sku || ($sku['status'] ?? '') !== 'enabled') {
                $invalidIds[] = (int)$r['id'];
            }
        }
        if ($invalidIds) Db::name('cart')->whereIn('id', $invalidIds)->delete();
        return json(['code' => 0, 'msg' => 'ok', 'data' => ['removed' => count($invalidIds)]]);
    }

    /** 调 PIM 批量 SKU */
    private function fetchSkus(array $codes, string $traceId): array
    {
        if (!$codes) return [];
        $pimUrl = env('PIM_BACKEND_URL', 'http://pim-backend');
        try {
            $client = new Client(['timeout' => 3.0]);
            $resp = $client->post($pimUrl . '/api/v1/sku/batch', [
                'json' => ['sku_codes' => $codes],
                'headers' => ['X-Trace-Id' => $traceId],
            ]);
            $body = json_decode((string)$resp->getBody(), true);
            $map = [];
            foreach (($body['data'] ?? []) as $row) {
                $map[$row['sku_code']] = $row;
            }
            return $map;
        } catch (\Throwable) {
            return [];
        }
    }
}
