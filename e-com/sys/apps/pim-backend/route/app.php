<?php
use think\facade\Route;

Route::get('/health', 'Health/index');

Route::group('api/v1', function () {
    // 公开读接口（小程序/shop BFF 用）
    Route::get ('product/list',     'Product/list');
    Route::get ('product/:sku',     'Product/detail')->pattern(['sku' => '[\w\-\.]+']);
    Route::get ('sku/:code',        'Sku/detail')->pattern(['code' => '[\w\-\.]+']);
    // iter-57 Q34-02 — 公开列 SPU 下所有 SKU（换货下拉用）
    Route::get ('spu/<id>/skus',    'Sku/listBySpu')->pattern(['id' => '\d+']);
    Route::post('sku/batch',        'Sku/batch');
    Route::post('spu/batch',        'Product/batchSpus');  // iter-20: 收藏列表用
    Route::get ('category/list',    'Category/list');
    Route::get ('brand/list',       'Brand/list');

    // === 上下架（限 super_admin/sales_ops/store_owner，不含 editor/store_staff，iter-43 EFF-04）===
    Route::group(function () {
        Route::post  ('admin/spu/<id>/publish',     'Product/publish')->pattern(['id' => '\d+']);
        Route::post  ('admin/spu/<id>/offline',     'Product/offline')->pattern(['id' => '\d+']);
    })->middleware(\app\middleware\AdminAuth::class, 'super_admin', 'sales_ops', 'store_owner');

    // === 后台写接口（先 :id 路由 → 再 plain 路由）===
    // iter-17: 套 AdminAuth middleware，限 super_admin / sales_ops（iter-43 EFF-04 加 editor 只读+CRUD 草稿，不可发布）
    Route::group(function () {
        // 类目
        Route::post  ('admin/category/reorder',     'Category/reorder');
        Route::get   ('admin/category/<id>',        'Category/detail')->pattern(['id' => '\d+']);
        Route::put   ('admin/category/<id>',        'Category/update')->pattern(['id' => '\d+']);
        Route::delete('admin/category/<id>',        'Category/delete')->pattern(['id' => '\d+']);
        Route::post  ('admin/category',             'Category/create');

        // 品牌
        Route::get   ('admin/brand/<id>',           'Brand/detail')->pattern(['id' => '\d+']);
        Route::put   ('admin/brand/<id>',           'Brand/update')->pattern(['id' => '\d+']);
        Route::delete('admin/brand/<id>',           'Brand/delete')->pattern(['id' => '\d+']);
        Route::post  ('admin/brand',                'Brand/create');

        // SPU（publish/offline 上面独立 group）
        Route::get   ('admin/spu/list',             'Product/adminList');
        Route::get   ('admin/spu/export',           'Product/exportCsv');
        Route::post  ('admin/spu/import',           'Product/importCsv');
        Route::get   ('admin/spu/<id>/status-log',  'Admin/spuStatusLog')->pattern(['id' => '\d+']);
        Route::get   ('admin/spu/<id>',             'Product/spuDetail')->pattern(['id' => '\d+']);
        Route::put   ('admin/spu/<id>',             'Product/update')->pattern(['id' => '\d+']);
        Route::delete('admin/spu/<id>',             'Product/softDelete')->pattern(['id' => '\d+']);
        Route::post  ('admin/spu',                  'Product/create');

        // SKU
        Route::put   ('admin/sku/<code>',           'Sku/update')->pattern(['code' => '[\w\-\.]+']);
        Route::delete('admin/sku/<code>',           'Sku/softDelete')->pattern(['code' => '[\w\-\.]+']);
        Route::post  ('admin/sku',                  'Sku/create');

        // 图片上传
        Route::post  ('admin/upload/image',         'Upload/image');

        // iter-29: Audit log + Dashboard
        Route::get   ('admin/audit-log',            'Admin/auditLog');
        Route::get   ('admin/stats',                'Admin/stats');
        // iter-36 BIZ-08-2 店铺列表（Vue 下拉用）
        Route::get   ('admin/store-list',           'Admin/storeList');
        // iter-44 EFF-02 ⌘K SPU 快速搜索
        Route::get   ('admin/quick-search',         'Admin/quickSearch');
        // iter-48 BI-03 SKU 生命周期分析
        Route::get   ('admin/bi/sku-lifecycle',     'Admin/skuLifecycle');
        Route::get   ('admin/bi/sku-lifecycle/trend', 'Admin/skuLifecycleTrend'); // iter-63 Q48-02
        // iter-53 Q48-01 批量下架"淘汰"阶段
        Route::post  ('admin/bi/sku-lifecycle/batch-offline', 'Admin/skuLifecycleBatchOffline');
        // iter-70 Q36-02 SPU 批量改 store_id
        Route::post  ('admin/spus/batch-set-store', 'Admin/spusBatchSetStore');
        // iter-71 异步导入 + 图库 recount
        Route::get   ('admin/import-tasks',         'Admin/importTaskList');
        Route::get   ('admin/import-tasks/<id>',    'Admin/importTaskDetail')->pattern(['id' => '\d+']);
        Route::post  ('admin/import-tasks',         'Admin/importTaskCreate');
        Route::post  ('admin/image-library/recount','Admin/imageLibraryRecount');

        // iter-30 B: 属性模板
        Route::get   ('admin/attribute-template/list',     'AttributeTemplate/list');
        Route::get   ('admin/attribute-template/<id>',     'AttributeTemplate/detail')->pattern(['id' => '\d+']);
        Route::put   ('admin/attribute-template/<id>',     'AttributeTemplate/update')->pattern(['id' => '\d+']);
        Route::delete('admin/attribute-template/<id>',     'AttributeTemplate/delete')->pattern(['id' => '\d+']);
        Route::post  ('admin/attribute-template',          'AttributeTemplate/create');

        // iter-30 C: 图片库
        Route::get   ('admin/image-library/list',          'ImageLibrary/list');
        Route::delete('admin/image-library/<id>',          'ImageLibrary/delete')->pattern(['id' => '\d+']);
    })->middleware(\app\middleware\AdminAuth::class, 'super_admin', 'sales_ops', 'store_owner', 'store_staff', 'editor');
});
