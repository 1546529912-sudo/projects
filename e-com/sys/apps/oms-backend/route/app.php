<?php
use think\facade\Route;

Route::get('/health', 'Health/index');

Route::group('api/v1', function () {
    // 订单——精确匹配优先，参数路由后置
    Route::post('order/create',                 'Order/create');
    Route::get ('order/list',                   'Order/list');
    Route::post('order/<orderNo>/cancel',       'Order/cancel')->pattern(['orderNo' => '[\w\-]+']);
    Route::post('order/<orderNo>/confirm',      'Order/confirm')->pattern(['orderNo' => '[\w\-]+']);
    Route::post('order/<orderNo>/wms-shipped',  'Order/wmsShipped')->pattern(['orderNo' => '[\w\-]+']);
    Route::get ('order/<orderNo>',              'Order/detail')->pattern(['orderNo' => '[\w\-]+']);

    // 库存
    Route::get ('inventory/batch',              'Inventory/batch');
    Route::post('inventory/batch',              'Inventory/batch');
    Route::post('inventory/precheck',           'Inventory/precheck');
    Route::get ('inventory/<sku>',              'Inventory/get')->pattern(['sku' => '[\w\-\.]+']);

    // 支付回调
    Route::post('payment/callback',             'Payment/callback');

    // === 退款 user 接口（参数路由放 plain 之前）===
    Route::get ('refund/list',                  'Refund/userList');
    Route::get ('refund/<refundNo>',            'Refund/userDetail')->pattern(['refundNo' => '[\w\-]+']);
    Route::post('refund',                       'Refund/apply');

    // === iter-34 换货 user 接口 ===
    Route::get ('exchange/list',                'Exchange/list');
    Route::post('exchange/<no>/cancel',         'Exchange/cancel')->pattern(['no' => '[\w\-]+']);
    Route::get ('exchange/<no>',                'Exchange/detail')->pattern(['no' => '[\w\-]+']);
    Route::post('exchange',                     'Exchange/apply');

    // 后台登录（无 middleware）
    Route::post('admin/login',                  'AdminAuth/login');

    // iter-27 Q19-02: shop-backend infra 调用（首次登录触发新人券）
    Route::post('coupon/auto-grant',            'CouponRule/trigger');

    // === 后台受保护接口（AdminAuth middleware）===
    Route::group(function () {
        Route::get ('admin/me',                     'AdminAuth/me');
        Route::get ('admin/order/list',             'Admin/orderList');
        Route::get ('admin/stats',                  'Admin/stats');
        Route::get ('admin/inventory/list',         'Admin/inventoryList');
        Route::get ('admin/dead-letter',            'Admin/deadLetter');
        // iter-42 EFF-08 一键 replay
        Route::post('admin/dead-letter/<id>/replay','Admin/deadLetterReplay')->pattern(['id' => '\d+']);
        Route::get ('admin/audit-log',              'Admin/auditLog');
        // iter-42 EFF-05 待办中心聚合
        Route::get ('admin/todos/counts',           'Admin/todosCounts');
        // iter-44 EFF-02 ⌘K 全局快速搜索
        Route::get ('admin/quick-search',           'Admin/quickSearch');
        // iter-46 BI-01 用户 RFM 分层
        Route::get ('admin/bi/rfm',                 'Admin/rfmAnalysis');
        // iter-47 BI-02 订单漏斗
        Route::get ('admin/bi/funnel',              'Admin/funnelAnalysis');
        // iter-49 BI-04 异常预警面板
        Route::get ('admin/bi/alerts',              'Admin/alertSummary');
        // iter-52 系统配置 KV
        Route::get ('admin/config/list',            'Admin/configList');
        Route::put ('admin/config',                 'Admin/configUpdate');
        // iter-53 Q46-02 BI 联动：RFM 分群发券
        Route::post('admin/bi/rfm/grant-coupon',    'Admin/rfmGrantCoupon');
        // iter-63 BI 深化
        Route::get ('admin/bi/rfm/trend',           'Admin/rfmTrend');
        Route::get ('admin/bi/rfm/user/<userId>',   'Admin/rfmUserDetail')->pattern(['userId' => '\d+']);
        Route::get ('admin/bi/funnel/cohort',       'Admin/funnelCohort');
        Route::get ('admin/bi/funnel/timeseries',   'Admin/funnelTimeseries');
        Route::get ('admin/bi/funnel/by-category',  'Admin/funnelByCategory');
        Route::get ('admin/bi/funnel/drop-reasons', 'Admin/funnelDropReasons');
        Route::get ('admin/bi/alerts/history',      'Admin/alertHistory');
        // iter-64 效率深化
        Route::get ('admin/views',                  'Admin/viewList');
        Route::post('admin/views',                  'Admin/viewSave');
        Route::delete('admin/views/<id>',           'Admin/viewDelete')->pattern(['id' => '\d+']);
        Route::get ('admin/stream-policies',        'Admin/streamPolicyList');
        Route::post('admin/stream-policies',        'Admin/streamPolicyUpdate');
        Route::post('admin/audit-log/<id>/reverse', 'Admin/auditReverse')->pattern(['id' => '\d+']);
        // iter-67
        Route::get ('admin/coupon/<id>/share',      'Admin/couponShareLink')->pattern(['id' => '\d+']);
        Route::get ('admin/bi/coupon/funnel',       'Admin/couponFunnel');
        // iter-68
        Route::get ('admin/bi/retention',           'Admin/retentionWindows');
        Route::get ('admin/bi/repurchase',          'Admin/repurchaseStats');
        Route::get ('admin/bi/review-buckets',      'Admin/reviewBuckets');
        Route::get ('admin/stats/range',            'Admin/statsRange');
        Route::get ('admin/webhooks/subscribers',   'Admin/webhookSubscribers');
        Route::post('admin/webhooks/test',          'Admin/webhookTestSend');
        // iter-70
        Route::get ('admin/webhook/delivery-log',   'Admin/webhookDeliveryLog');
        Route::get ('admin/stores/search',          'Admin/storesSearchRanked');
        // iter-71 异步导出
        Route::get ('admin/export-tasks',           'Admin/exportTaskList');
        Route::get ('admin/export-tasks/<id>',      'Admin/exportTaskDetail')->pattern(['id' => '\d+']);
        Route::post('admin/export-tasks/<id>/run',  'Admin/exportTaskRunNow')->pattern(['id' => '\d+']);
        Route::post('admin/export-tasks',           'Admin/exportTaskCreate');
        // iter-72 Q35-01/Q39-02 店铺装修管理
        Route::get ('admin/store/<storeId>/page',           'Admin/storePageGet')->pattern(['storeId' => '\d+']);
        Route::post('admin/store/<storeId>/page',           'Admin/storePageSave')->pattern(['storeId' => '\d+']);
        Route::post('admin/store/<storeId>/page/publish',   'Admin/storePagePublish')->pattern(['storeId' => '\d+']);
        // iter-72 Q26-02 结算单审批流
        Route::post('admin/settlement/<id>/approve',        'Admin/settlementApprove')->pattern(['id' => '\d+']);
        Route::post('admin/settlement/<id>/reject',         'Admin/settlementReject')->pattern(['id' => '\d+']);
        // iter-56 Q39-04 店铺评分批刷新
        Route::post('admin/stores/refresh-ratings', 'Admin/refreshStoreRatings');

        // iter-18 导出
        Route::get ('admin/order/export',           'Admin/exportOrders');
        Route::get ('admin/refund/export',          'Admin/exportRefunds');
        Route::get ('admin/inventory/export',       'Admin/exportInventory');

        // iter-18 批量操作（plain 路由放参数路由前避免冲突）
        Route::post('admin/order/batch-cancel',     'Admin/batchCancelOrders');
        Route::post('admin/refund/batch-approve',   'Refund/batchApprove');
        Route::post('admin/refund/batch-reject',    'Refund/batchReject');

        Route::post('admin/order/<orderNo>/cancel', 'Admin/cancelOrder')->pattern(['orderNo' => '[\w\-]+']);
        Route::post('admin/order/<orderNo>/recover','Admin/recoverOrder')->pattern(['orderNo' => '[\w\-]+']);
        Route::put ('admin/inventory/<sku>',        'Admin/adjustInventory')->pattern(['sku' => '[\w\-\.]+']);
        Route::get ('admin/order/<orderNo>',        'Admin/orderDetail')->pattern(['orderNo' => '[\w\-]+']);

        Route::get ('admin/refund/list',            'Refund/adminList');
        Route::post('admin/refund/<refundNo>/approve','Refund/approve')->pattern(['refundNo' => '[\w\-]+']);
        Route::post('admin/refund/<refundNo>/reject', 'Refund/reject')->pattern(['refundNo' => '[\w\-]+']);
        Route::post('admin/refund/<refundNo>/confirm','Refund/confirm')->pattern(['refundNo' => '[\w\-]+']);
        Route::get ('admin/refund/<refundNo>',      'Refund/adminDetail')->pattern(['refundNo' => '[\w\-]+']);

    // iter-55 Q44-05 全后端 editor 横切审视：editor 不可访问 OMS（仅 PIM）；warehouse 保留读
    })->middleware(\app\middleware\AdminAuth::class, 'super_admin', 'sales_ops', 'warehouse', 'store_owner', 'store_staff');

    // === admin 用户管理（iter-17，仅 super_admin）===
    Route::group(function () {
        Route::get   ('admin/user/list',                 'AdminUser/list');
        Route::post  ('admin/user/<id>/change-password', 'AdminUser/changePassword')->pattern(['id' => '\d+']);
        Route::put   ('admin/user/<id>',                 'AdminUser/update')->pattern(['id' => '\d+']);
        Route::delete('admin/user/<id>',                 'AdminUser/delete')->pattern(['id' => '\d+']);
        Route::post  ('admin/user',                      'AdminUser/create');
    })->middleware(\app\middleware\AdminAuth::class, 'super_admin');

    // === 优惠券管理（iter-19，super_admin + sales_ops）===
    // 注意：参数路由在前，plain POST 在后（与 admin/user 同模式）
    Route::group(function () {
        Route::get ('admin/coupon/list',          'Coupon/list');
        Route::post('admin/coupon/<id>/disable',  'Coupon/disable')->pattern(['id' => '\d+']);
        Route::put ('admin/coupon/<id>',          'Coupon/update')->pattern(['id' => '\d+']);
        Route::post('admin/coupon',               'Coupon/create');

        // iter-27 Q19-02 自动发券规则
        Route::get ('admin/coupon-rule/list',     'CouponRule/list');
        Route::put ('admin/coupon-rule/<id>',     'CouponRule/update')->pattern(['id' => '\d+']);
        Route::delete('admin/coupon-rule/<id>',   'CouponRule/delete')->pattern(['id' => '\d+']);
        Route::post('admin/coupon-rule',          'CouponRule/create');

        // iter-20 评价审核（同 super_admin + sales_ops）
        Route::get ('admin/review/list',          'Review/list');
        Route::post('admin/review/<id>/hide',     'Review/hide')->pattern(['id' => '\d+']);
        Route::post('admin/review/<id>/restore',  'Review/restore')->pattern(['id' => '\d+']);

        // iter-26 P0-3 财务结算单（super_admin + sales_ops）
        Route::get ('admin/settlement/export',    'Settlement/export');
        Route::get ('admin/settlement/list',      'Settlement/list');
        Route::post('admin/settlement/<no>/settle', 'Settlement/settle')->pattern(['no' => '[\w\-]+']);
        Route::get ('admin/settlement/<no>',      'Settlement/detail')->pattern(['no' => '[\w\-]+']);

        // iter-34 换货 admin（super_admin + sales_ops；warehouse 不可决定换货审批）
        Route::get ('admin/exchange/list',                'Exchange/adminList');
        Route::post('admin/exchange/<no>/approve',        'Exchange/approve')->pattern(['no' => '[\w\-]+']);
        Route::post('admin/exchange/<no>/reject',         'Exchange/reject')->pattern(['no' => '[\w\-]+']);
        Route::post('admin/exchange/<no>/received-old',   'Exchange/receivedOld')->pattern(['no' => '[\w\-]+']);
        Route::post('admin/exchange/<no>/sent-new',       'Exchange/sentNew')->pattern(['no' => '[\w\-]+']);
        Route::post('admin/exchange/<no>/complete',       'Exchange/complete')->pattern(['no' => '[\w\-]+']);
        Route::get ('admin/exchange/<no>',                'Exchange/adminDetail')->pattern(['no' => '[\w\-]+']);
    })->middleware(\app\middleware\AdminAuth::class, 'super_admin', 'sales_ops');

    // === iter-39 BIZ-08-5 店铺公开读 + 店主自管 ===
    Route::get   ('store/:code',                                   'Store/publicDetail')->pattern(['code' => '[\w\-\.]+']);
    // iter-62 Q39-01 商家自助入驻（公开 endpoint，无鉴权）
    Route::post  ('merchant/apply',                                'Store/publicApply');
    // iter-72 Q35-01/Q39-02 店铺装修公开读
    Route::get   ('store/:storeId/page',                           'Store/publicPage')->pattern(['storeId' => '\d+']);
    Route::group(function () {
        Route::put   ('admin/store/me',                            'Store/selfUpdate');
    })->middleware(\app\middleware\AdminAuth::class, 'store_owner');

    // === iter-50 商家提现（Q35-03 / Q39-03 多商家收口）===
    // 商家+staff 角色：申请 + 查余额 + 看自己单；super_admin：审批/打款/拒绝；sales_ops：只读
    // 注意：参数路由必须放 plain POST 前（沿 iter-19 路由顺序经验）
    Route::group(function () {
        Route::get ('admin/withdrawal/balance',          'Withdrawal/balance');
        Route::get ('admin/withdrawal/list',             'Withdrawal/list');
        // iter-56 Q50-04 月度结算单
        Route::get ('admin/withdrawal/monthly-statement','Admin/withdrawalMonthlyStatement');
        Route::post('admin/withdrawal/<no>/approve',     'Withdrawal/approve')->pattern(['no' => '[\w\-]+']);
        Route::post('admin/withdrawal/<no>/reject',      'Withdrawal/reject')->pattern(['no' => '[\w\-]+']);
        Route::post('admin/withdrawal/<no>/pay',         'Withdrawal/pay')->pattern(['no' => '[\w\-]+']);
        Route::post('admin/withdrawal',                  'Withdrawal/apply');
    })->middleware(\app\middleware\AdminAuth::class, 'super_admin', 'sales_ops', 'store_owner', 'store_staff');

    // === iter-40 BIZ-09-1 内容运营公开读（无需鉴权）===
    Route::get   ('banner/list',                                   'Banner/publicListBanner');
    Route::get   ('featured/list',                                 'Banner/publicListFeatured');

    // === iter-41 BIZ-09-2 营销专题公开读 ===
    Route::get   ('topic/list',                                    'MarketingTopic/publicList');
    Route::get   ('topic/<code>',                                  'MarketingTopic/publicDetail')->pattern(['code' => '[\w\-\.]+']);

    // === iter-40 BIZ-09-1 内容运营 admin (super + sales) ===
    Route::group(function () {
        Route::get   ('admin/banner/list',                         'Banner/adminListBanner');
        Route::post  ('admin/banner',                              'Banner/adminCreateBanner');
        Route::put   ('admin/banner/<id>',                         'Banner/adminUpdateBanner')->pattern(['id' => '\d+']);
        Route::delete('admin/banner/<id>',                         'Banner/adminDeleteBanner')->pattern(['id' => '\d+']);
        Route::get   ('admin/featured/list',                       'Banner/adminListFeatured');
        Route::post  ('admin/featured',                            'Banner/adminCreateFeatured');
        Route::put   ('admin/featured/<id>',                       'Banner/adminUpdateFeatured')->pattern(['id' => '\d+']);
        Route::delete('admin/featured/<id>',                       'Banner/adminDeleteFeatured')->pattern(['id' => '\d+']);

        // iter-41 BIZ-09-2 专题 admin + 营销日历
        Route::get   ('admin/topic/list',                          'MarketingTopic/adminList');
        Route::post  ('admin/topic/<id>/items',                    'MarketingTopic/adminAddItems')->pattern(['id' => '\d+']);
        Route::delete('admin/topic/<id>/items/<spuId>',            'MarketingTopic/adminRemoveItem')->pattern(['id' => '\d+', 'spuId' => '\d+']);
        Route::get   ('admin/topic/<id>',                          'MarketingTopic/adminDetail')->pattern(['id' => '\d+']);
        Route::put   ('admin/topic/<id>',                          'MarketingTopic/adminUpdate')->pattern(['id' => '\d+']);
        Route::delete('admin/topic/<id>',                          'MarketingTopic/adminDelete')->pattern(['id' => '\d+']);
        Route::post  ('admin/topic',                               'MarketingTopic/adminCreate');
        Route::get   ('admin/marketing-calendar',                  'MarketingTopic/adminCalendar');
    })->middleware(\app\middleware\AdminAuth::class, 'super_admin', 'sales_ops');

    // === iter-35 BIZ-08-1 店铺管理（super_admin 独占）===
    Route::group(function () {
        Route::get   ('admin/store/list',                          'Store/list');
        Route::post  ('admin/store/<id>/approve',                  'Store/approve')->pattern(['id' => '\d+']);
        Route::post  ('admin/store/<id>/suspend',                  'Store/suspend')->pattern(['id' => '\d+']);
        Route::post  ('admin/store/<id>/resume',                   'Store/resume')->pattern(['id' => '\d+']);
        Route::post  ('admin/store/<id>/commission',               'Store/updateCommission')->pattern(['id' => '\d+']);
        Route::post  ('admin/store/<id>/admins',                   'Store/addAdmin')->pattern(['id' => '\d+']);
        Route::delete('admin/store/<id>/admins/<adminUserId>',     'Store/removeAdmin')->pattern(['id' => '\d+', 'adminUserId' => '\d+']);
        Route::get   ('admin/store/<id>',                          'Store/detail')->pattern(['id' => '\d+']);
        Route::post  ('admin/store',                               'Store/create');
    })->middleware(\app\middleware\AdminAuth::class, 'super_admin');

    // === iter-26 P0-2 OMS 视角对账（super_admin 独占）+ iter-28 webhook ===
    Route::group(function () {
        Route::get ('admin/reconcile/list',           'Reconcile/list');
        Route::post('admin/reconcile/<no>/confirm',   'Reconcile/confirm')->pattern(['no' => '[\w\-]+']);
        Route::get ('admin/reconcile/<no>',           'Reconcile/detail')->pattern(['no' => '[\w\-]+']);
        Route::post('admin/reconcile',                'Reconcile/create');

        // iter-28 A1 webhook
        Route::get ('admin/webhook/list',             'Webhook/list');
        Route::post('admin/webhook/<id>/test',        'Webhook/test')->pattern(['id' => '\d+']);
        Route::put ('admin/webhook/<id>',             'Webhook/update')->pattern(['id' => '\d+']);
        Route::delete('admin/webhook/<id>',           'Webhook/delete')->pattern(['id' => '\d+']);
        Route::post('admin/webhook',                  'Webhook/create');
    })->middleware(\app\middleware\AdminAuth::class, 'super_admin');
});
