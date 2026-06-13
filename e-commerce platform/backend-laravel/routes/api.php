<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\HealthController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CompanyController;
use App\Http\Controllers\Api\RoleController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\ProductAdminController;
use App\Http\Controllers\Api\AddressController;
use App\Http\Controllers\Api\CartController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\PaymentController;
use App\Http\Controllers\Api\OrderAdminController;
use App\Http\Controllers\Api\AiController;
use App\Http\Controllers\Api\KnowledgeAdminController;
use App\Http\Controllers\Api\AdminStockAlertController;
use App\Http\Controllers\Api\AdminAiFeedbackController;
use App\Http\Controllers\Api\AdminFailedJobController;

Route::prefix('v1')->group(function () {

    Route::get('/health', [HealthController::class, 'index']);

    /* ---------- Auth (TRADE-001-01/02/03) ---------- */
    Route::prefix('auth')->group(function () {
        Route::post('/sms/send', [AuthController::class, 'sendSmsCode']);
        Route::post('/register', [AuthController::class, 'register']);
        Route::post('/login', [AuthController::class, 'login']);
        Route::post('/wechat/callback', [AuthController::class, 'wechatCallback']);
        Route::post('/logout', [AuthController::class, 'logout'])->middleware('auth:sanctum');
        Route::post('/refresh', [AuthController::class, 'refresh'])->middleware('auth:sanctum');
    });

    /* ---------- Public Catalog (TRADE-002) ---------- */
    Route::get('/categories', [CategoryController::class, 'index']);
    Route::get('/products', [ProductController::class, 'index']);
    Route::get('/products/recommended', [ProductController::class, 'recommended']);
    Route::get('/products/{id}', [ProductController::class, 'show']);

    Route::middleware(['auth:sanctum', 'rotate.token'])->group(function () {
        /* ---------- User (TRADE-001-06) ---------- */
        Route::get('/users/me', [AuthController::class, 'me']);
        Route::post('/users/role/switch', [RoleController::class, 'switch']);

        /* ---------- iter-23 设备管理 ---------- */
        Route::get('/auth/devices', [AuthController::class, 'devices']);
        Route::delete('/auth/devices/{id}', [AuthController::class, 'revokeDevice']);
        Route::post('/auth/logout-others', [AuthController::class, 'logoutOthers']);

        /* ---------- Company (TRADE-001-04) ---------- */
        Route::post('/companies', [CompanyController::class, 'store']);
        Route::get('/companies/me', [CompanyController::class, 'me']);
        Route::post('/upload/license', [CompanyController::class, 'uploadLicense']);

        /* ---------- Address (TRADE-004-01) ---------- */
        Route::get('/addresses', [AddressController::class, 'index']);
        Route::post('/addresses', [AddressController::class, 'store']);
        Route::put('/addresses/{id}', [AddressController::class, 'update']);
        Route::delete('/addresses/{id}', [AddressController::class, 'destroy']);

        /* ---------- Cart (TRADE-003) ---------- */
        Route::get('/cart', [CartController::class, 'index']);
        Route::post('/cart/items', [CartController::class, 'addItem']);
        Route::put('/cart/items/{id}', [CartController::class, 'updateItem']);
        Route::delete('/cart/items/{id}', [CartController::class, 'removeItem']);
        Route::post('/cart/items/select-all', [CartController::class, 'selectAll']);
        Route::delete('/cart/items/invalid', [CartController::class, 'clearInvalid']);

        /* ---------- Order (TRADE-004 / TRADE-006) ---------- */
        Route::get('/orders', [OrderController::class, 'index']);
        Route::post('/orders', [OrderController::class, 'store']);
        Route::get('/orders/{id}', [OrderController::class, 'show']);
        Route::post('/orders/{id}/cancel', [OrderController::class, 'cancel']);
        Route::post('/orders/{id}/confirm-receipt', [OrderController::class, 'confirmReceipt']);

        /* ---------- Payment (TRADE-005) ---------- */
        Route::post('/payments', [PaymentController::class, 'initiate']);
        Route::post('/payments/{id}/mock-success', [PaymentController::class, 'mockSuccess']);
        Route::post('/payments/{id}/voucher', [PaymentController::class, 'uploadVoucher']);

        /* ---------- AI (AI-001 / AI-002) ---------- */
        Route::post('/ai/conversations', [AiController::class, 'createConversation']);
        Route::get('/ai/conversations/{id}', [AiController::class, 'getConversation']);
        Route::post('/ai/conversations/{id}/messages', [AiController::class, 'sendMessage']);
        Route::get('/ai/quotations/{id}', [AiController::class, 'getQuotation']);
        Route::post('/ai/quotations/{id}/add-to-cart', [AiController::class, 'addQuotationToCart']);
        // iter-13 用户对 AI 消息踩/赞
        Route::post('/ai/feedbacks', [AiController::class, 'submitFeedback']);

        /* ---------- Admin (TRADE-001-05, TRADE-007) ---------- */
        // iter-12：所有 admin 接口需 role=admin（之前仅靠前端 router meta 拦，后端兜底）
        Route::prefix('admin')->middleware('role.admin')->group(function () {
            Route::get('/companies/pending', [CompanyController::class, 'adminPending']);
            Route::post('/companies/{id}/review', [CompanyController::class, 'adminReview']);

            Route::get('/products', [ProductAdminController::class, 'index']);
            Route::post('/products', [ProductAdminController::class, 'store']);
            Route::get('/products/{id}', [ProductAdminController::class, 'show']);
            Route::put('/products/{id}', [ProductAdminController::class, 'update']);
            Route::post('/products/{id}/toggle', [ProductAdminController::class, 'toggle']);

            Route::get('/orders', [OrderAdminController::class, 'index']);
            Route::post('/orders/{id}/ship', [OrderAdminController::class, 'ship']);
            Route::post('/payments/{id}/review', [OrderAdminController::class, 'reviewVoucher']);

            // AI-004 知识库管理
            Route::get('/knowledge', [KnowledgeAdminController::class, 'index']);
            Route::post('/knowledge', [KnowledgeAdminController::class, 'store']);
            Route::get('/knowledge/{id}', [KnowledgeAdminController::class, 'show']);
            Route::put('/knowledge/{id}', [KnowledgeAdminController::class, 'update']);
            Route::delete('/knowledge/{id}', [KnowledgeAdminController::class, 'destroy']);
            Route::post('/knowledge/{id}/toggle', [KnowledgeAdminController::class, 'toggle']);

            // iter-11 库存预警
            Route::get('/stock-alerts', [AdminStockAlertController::class, 'index']);
            Route::post('/stock-alerts/{id}/resolve', [AdminStockAlertController::class, 'resolve']);

            // iter-13 AI Bad Case
            Route::get('/ai/feedbacks', [AdminAiFeedbackController::class, 'index']);
            Route::post('/ai/feedbacks/{id}/label', [AdminAiFeedbackController::class, 'label']);
            Route::get('/ai/feedbacks/stats', [AdminAiFeedbackController::class, 'stats']);
            // iter-14 导出
            Route::get('/ai/feedbacks/export.csv', [AdminAiFeedbackController::class, 'exportCsv']);
            Route::get('/ai/feedbacks/export.jsonl', [AdminAiFeedbackController::class, 'exportJsonl']);

            // iter-19 死信队列
            Route::get('/failed-jobs', [AdminFailedJobController::class, 'index']);
            Route::get('/failed-jobs/stats', [AdminFailedJobController::class, 'stats']);
            Route::post('/failed-jobs/clear', [AdminFailedJobController::class, 'clear']);
            Route::post('/failed-jobs/{uuid}/retry', [AdminFailedJobController::class, 'retry']);
            Route::delete('/failed-jobs/{uuid}', [AdminFailedJobController::class, 'destroy']);
        });
    });
});
