<?php
use think\facade\Route;

Route::get('/health', 'Health/index');

Route::group('api/v1', function () {
    // OMS 下发拣货单（内部 infra 调用，无 admin 鉴权 — iter-9 起 oms-backend 事件式触发，但保留 HTTP 接口作 backup）
    Route::post('picking-order',                    'Picking/create');

    // === 后台管理接口（iter-17：套 AdminAuth middleware，限 warehouse / super_admin）===
    Route::group(function () {
        // 出库单
        Route::get ('outbound/list',                    'Outbound/list');
        Route::post('outbound/<outboundNo>/auto-complete', 'Outbound/autoComplete')->pattern(['outboundNo' => '[\w\-]+']);
        Route::get ('outbound/<outboundNo>',            'Outbound/detail')->pattern(['outboundNo' => '[\w\-]+']);

        // 仓库 CRUD（参数路由放 plain 之前）
        Route::get ('warehouse/list',                   'Warehouse/list');
        Route::get ('warehouse/<code>',                 'Warehouse/detail')->pattern(['code' => '[\w\-\.]+']);
        Route::put ('warehouse/<code>',                 'Warehouse/update')->pattern(['code' => '[\w\-\.]+']);
        Route::delete('warehouse/<code>',               'Warehouse/delete')->pattern(['code' => '[\w\-\.]+']);
        Route::post('warehouse',                        'Warehouse/create');

        // 库位 CRUD
        Route::get ('location/list',                    'Location/list');
        Route::post('location/batch',                   'Location/batch');
        Route::get ('location/<code>',                  'Location/detail')->pattern(['code' => '[\w\-\.]+']);
        Route::put ('location/<code>',                  'Location/update')->pattern(['code' => '[\w\-\.]+']);
        Route::delete('location/<code>',                'Location/delete')->pattern(['code' => '[\w\-\.]+']);
        Route::post('location',                         'Location/create');

        // 入库
        Route::get ('inbound/list',                     'Inbound/list');
        Route::post('inbound/<inboundNo>/auto-complete','Inbound/autoComplete')->pattern(['inboundNo' => '[\w\-]+']);
        Route::post('inbound/<inboundNo>/cancel',       'Inbound/cancel')->pattern(['inboundNo' => '[\w\-]+']);
        // iter-59 Q38-02 商家仓审核
        Route::post('inbound/<inboundNo>/review',       'Inbound/review')->pattern(['inboundNo' => '[\w\-]+']);
        Route::get ('inbound/<inboundNo>',              'Inbound/detail')->pattern(['inboundNo' => '[\w\-]+']);
        Route::post('inbound/recommend-locations',      'Inbound/recommendLocations');  // iter-22
        Route::post('inbound',                          'Inbound/create');

        // 库存（读）
        Route::get ('inventory/list',                   'Inventory/list');

        // 商品 read replica（PIM 同步，iter-13）
        Route::get ('product/list',                     'Product/list');

        // === iter-22 智能化 ===
        // 盘点（参数路由前置，plain 后置）
        Route::get ('stock-take/list',                  'StockTake/list');
        Route::post('stock-take/<takeNo>/items/<itemId>', 'StockTake/record')->pattern(['takeNo' => '[\w\-]+', 'itemId' => '\d+']);
        Route::post('stock-take/<takeNo>/start',        'StockTake/start')->pattern(['takeNo' => '[\w\-]+']);
        Route::post('stock-take/<takeNo>/complete',     'StockTake/complete')->pattern(['takeNo' => '[\w\-]+']);
        Route::post('stock-take/<takeNo>/cancel',       'StockTake/cancel')->pattern(['takeNo' => '[\w\-]+']);
        Route::get ('stock-take/<takeNo>',              'StockTake/detail')->pattern(['takeNo' => '[\w\-]+']);
        Route::post('stock-take',                       'StockTake/create');

        // 调拨
        Route::get ('transfer/list',                    'Transfer/list');
        Route::post('transfer/<transferNo>/ship',       'Transfer/ship')->pattern(['transferNo' => '[\w\-]+']);
        Route::post('transfer/<transferNo>/receive',    'Transfer/receive')->pattern(['transferNo' => '[\w\-]+']);
        Route::post('transfer/<transferNo>/cancel',     'Transfer/cancel')->pattern(['transferNo' => '[\w\-]+']);
        // iter-61 Q38-01 跨店调拨平台审核
        Route::post('transfer/<transferNo>/review',     'Transfer/review')->pattern(['transferNo' => '[\w\-]+']);
        // iter-69 Q23-01/02/03 调拨深化
        Route::post('transfer/<transferNo>/receive-partial', 'Transfer/receivePartial')->pattern(['transferNo' => '[\w\-]+']);
        Route::post('transfer/<transferNo>/lines/<lineNo>/cancel', 'Transfer/cancelLine')->pattern(['transferNo' => '[\w\-]+', 'lineNo' => '\d+']);
        Route::get ('transfer/export-csv',              'Transfer/exportCsv');
        // iter-69 Q22-02 盘点 CSV
        Route::get ('stock-take/export-csv',            'StockTake/exportCsv');
        // iter-69 Q25-03 拣货 operator 维度
        Route::get ('picking-task/operator-stats',      'Picking/operatorStats');
        Route::get ('transfer/<transferNo>',            'Transfer/detail')->pattern(['transferNo' => '[\w\-]+']);
        Route::post('transfer',                         'Transfer/create');

        // === iter-24 P1-1 拣货任务（admin API；OMS infra POST /picking-order 还在 group 外）===
        Route::get ('picking-task/list',                 'Picking/adminList');
        Route::post('picking-task/<id>/assign',          'Picking/assign')->pattern(['id' => '\d+']);
        Route::post('picking-task/<id>/scan',            'Picking/scan')->pattern(['id' => '\d+']);
        Route::post('picking-task/<id>/complete',        'Picking/completeTask')->pattern(['id' => '\d+']);
        Route::get ('picking-task/<id>',                 'Picking/adminDetail')->pattern(['id' => '\d+']);

        // === iter-24 P0-1 库存日志查询 ===
        Route::get ('inventory-log/list',                'Inventory/logList');

        // === iter-24 P1-2 对账 ===
        Route::get ('reconcile/list',                    'Reconcile/list');
        Route::post('reconcile/<no>/confirm',            'Reconcile/confirm')->pattern(['no' => '[\w\-]+']);
        Route::get ('reconcile/<no>',                    'Reconcile/detail')->pattern(['no' => '[\w\-]+']);
        Route::post('reconcile',                         'Reconcile/create');

        // === iter-25 WMS Dashboard ===
        Route::get ('wms-stats',                         'Stats/stats');

        // === iter-25 低库存预警 ===
        Route::get ('stock-alert/list',                  'StockAlert/alertList');
        Route::get ('stock-alert/rules',                 'StockAlert/ruleList');
        Route::delete('stock-alert/rules/<sku>',         'StockAlert/ruleDelete')->pattern(['sku' => '[\w\-\.]+']);
        Route::post('stock-alert/rules',                 'StockAlert/ruleUpsert');

        // === iter-32 B: 盘点定时调度 ===
        Route::get ('stock-take-schedule/list',          'StockTakeSchedule/list');
        Route::post('stock-take-schedule/<id>/trigger',  'StockTakeSchedule/triggerNow')->pattern(['id' => '\d+']);
        Route::get ('stock-take-schedule/<id>',          'StockTakeSchedule/detail')->pattern(['id' => '\d+']);
        Route::put ('stock-take-schedule/<id>',          'StockTakeSchedule/update')->pattern(['id' => '\d+']);
        Route::delete('stock-take-schedule/<id>',        'StockTakeSchedule/delete')->pattern(['id' => '\d+']);
        Route::post('stock-take-schedule',               'StockTakeSchedule/create');

        // === iter-32 C: WMS 配置（推荐权重） ===
        Route::get ('config/location-weights/preview',   'WmsConfig/locationWeightsPreview');
        Route::get ('config/<key>',                      'WmsConfig/get')->pattern(['key' => '[\w\-\.]+']);
        Route::post('config/<key>',                      'WmsConfig/set')->pattern(['key' => '[\w\-\.]+']);

    })->middleware(\app\middleware\AdminAuth::class, 'warehouse', 'super_admin', 'store_owner', 'store_staff');
});
