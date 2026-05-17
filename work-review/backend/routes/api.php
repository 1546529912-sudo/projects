<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\HealthController;
use App\Http\Controllers\RecordController;
use App\Http\Controllers\AIController;
use App\Http\Controllers\ReportController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

// 健康检查（无需鉴权）
Route::get('/health', [HealthController::class, 'check']);

// 需要鉴权的路由（MVP 阶段暂用固定 token，后续接微信登录）
Route::middleware('auth:sanctum')->group(function () {

    // 工作录入
    Route::prefix('record')->group(function () {
        Route::post('/upload', [RecordController::class, 'upload']);   // 上传录音
        Route::post('/asr', [RecordController::class, 'asr']);         // 语音转文字
    });

    // AI 处理
    Route::prefix('ai')->group(function () {
        Route::post('/extract', [AIController::class, 'extract']);     // 槽位提取
        Route::post('/split', [AIController::class, 'split']);         // 项目拆分
    });

    // 日报
    Route::prefix('report')->group(function () {
        Route::post('/create', [ReportController::class, 'create']);   // 生成日报
        Route::post('/save', [ReportController::class, 'save']);       // 保存日报
        Route::get('/history', [ReportController::class, 'history']);  // 历史记录
        Route::get('/{id}', [ReportController::class, 'show']);        // 日报详情
    });
});
