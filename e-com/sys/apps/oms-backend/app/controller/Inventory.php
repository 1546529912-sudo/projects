<?php
declare(strict_types=1);

namespace app\controller;

use app\service\InventoryService;
use think\Request;
use think\Response;

class Inventory
{
    public function __construct(private InventoryService $service = new InventoryService()) {}

    public function get(string $sku): Response
    {
        return json(['code' => 0, 'msg' => 'ok', 'data' => $this->service->get($sku)]);
    }

    public function batch(Request $request): Response
    {
        $skus = $request->param('sku_codes', []);
        if (!is_array($skus)) $skus = [];
        return json(['code' => 0, 'msg' => 'ok', 'data' => $this->service->getBatch($skus)]);
    }

    public function precheck(Request $request): Response
    {
        $items = $request->param('items', []);
        if (!is_array($items)) $items = [];
        $shortage = $this->service->precheck($items);
        return json(['code' => 0, 'msg' => 'ok', 'data' => ['shortage' => $shortage, 'ok' => empty($shortage)]]);
    }
}
