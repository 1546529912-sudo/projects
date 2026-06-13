<?php
use think\facade\Route;

// 健康检查（无前缀，方便容器探针）
Route::get('/health', 'Health/index');

// === API v1 公开组（不需登录）===
Route::group('api/v1', function () {
    Route::post('sms/code',         'User/sendCode');
    Route::post('user/login',       'User/login');

    Route::get ('product/list',     'Product/list');
    // iter-57 Q34-02 换货 SKU 下拉
    Route::get ('sku/by-spu',       'Product/skusBySpu');
    Route::get ('product/:sku',     'Product/detail')->pattern(['sku' => '[\w\-\.]+']);

    // iter-39 BIZ-08-5 公开店铺信息（小程序商品详情/店铺主页）
    Route::get ('store/:code',      'Store/publicDetail')->pattern(['code' => '[\w\-\.]+']);

    // iter-40 BIZ-09-1 内容运营（公开读 Banner + 推荐位）
    Route::get ('banner/list',      'Cms/banner');
    Route::get ('featured/list',    'Cms/featured');

    // iter-41 BIZ-09-2 营销专题
    Route::get ('topic/list',       'Cms/topicList');
    Route::get ('topic/:code',      'Cms/topicDetail')->pattern(['code' => '[\w\-\.]+']);

    Route::post('payment/callback/mock', 'Payment/callbackMock');
})->middleware([
    \app\middleware\TraceId::class,
]);

// === API v1 鉴权组（需 Bearer token）===
Route::group('api/v1', function () {
    Route::post('user/logout',          'User/logout');
    Route::get ('user/me',              'User/me');

    Route::get   ('cart/list',          'Cart/list');
    Route::post  ('cart/add',           'Cart/add');
    Route::put   ('cart/:id',           'Cart/update')->pattern(['id' => '\d+']);
    Route::delete('cart/:id',           'Cart/delete')->pattern(['id' => '\d+']);
    Route::post  ('cart/clear-invalid', 'Cart/clearInvalid');

    Route::post('order/submit',             'Order/submit');
    Route::get ('order/list',               'Order/list');
    Route::get ('order/:orderNo',           'Order/detail')->pattern(['orderNo' => '[\w\-]+']);
    Route::post('order/:orderNo/cancel',    'Order/cancel')->pattern(['orderNo' => '[\w\-]+']);
    Route::post('order/:orderNo/confirm',   'Order/confirm')->pattern(['orderNo' => '[\w\-]+']);

    // 退款（参数路由放 plain 之前）
    Route::get ('refund/list',              'Refund/list');
    Route::get ('refund/:refundNo',         'Refund/detail')->pattern(['refundNo' => '[\w\-]+']);
    Route::post('refund',                   'Refund/apply');

    // iter-34 换货
    Route::get ('exchange/list',            'Exchange/list');
    Route::post('exchange/:no/cancel',      'Exchange/cancel')->pattern(['no' => '[\w\-]+']);
    Route::get ('exchange/:no',             'Exchange/detail')->pattern(['no' => '[\w\-]+']);
    Route::post('exchange',                 'Exchange/apply');

    // 优惠券（iter-19）—— plain 路由优先
    Route::get ('coupon/available',         'Coupon/available');
    Route::get ('coupon/my',                'Coupon/my');
    Route::post('coupon/check',             'Coupon/check');
    Route::post('coupon/:id/claim',         'Coupon/claim')->pattern(['id' => '\d+']);

    // iter-20 地址簿（参数路由前置；plain POST/GET 在后）
    Route::get   ('address/list',           'Address/list');
    Route::post  ('address/:id/default',    'Address/setDefault')->pattern(['id' => '\d+']);
    Route::put   ('address/:id',            'Address/update')->pattern(['id' => '\d+']);
    Route::delete('address/:id',            'Address/delete')->pattern(['id' => '\d+']);
    Route::post  ('address',                'Address/create');

    // iter-20 收藏
    Route::get ('favorite/list',            'Favorite/list');
    Route::get ('favorite/check/:spuId',    'Favorite/check')->pattern(['spuId' => '\d+']);
    Route::post('favorite/:spuId',          'Favorite/add')->pattern(['spuId' => '\d+']);
    Route::delete('favorite/:spuId',        'Favorite/remove')->pattern(['spuId' => '\d+']);
    Route::put ('favorite/:spuId',          'Favorite/updateGroup')->pattern(['spuId' => '\d+']);

    // iter-20 评价（plain GET 在前 + 参数路由 + plain POST 最后）
    Route::get ('review/my',                'Review/my');
    Route::get ('review/by-spu/:spuId',     'Review/bySpu')->pattern(['spuId' => '\d+']);
    // iter-67 Q20-03 点赞 / 商家回复
    Route::post('review/<id>/like',         'Review/like')->pattern(['id' => '\d+']);
    Route::post('review/<id>/reply',        'Review/reply')->pattern(['id' => '\d+']);
    Route::post('review',                   'Review/submit');

    // 用户态图片上传（退货凭证，iter-15）
    Route::post('upload/image',             'Upload/image');

    Route::post('payment/wxpay',            'Payment/wxpay');
})->middleware([
    \app\middleware\TraceId::class,
    \app\middleware\Auth::class,
]);
