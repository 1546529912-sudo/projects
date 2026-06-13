<?php

use App\Http\Controllers\AnnotationController;
use App\Http\Controllers\DemoController;
use App\Http\Controllers\VersionController;
use App\Http\Controllers\WorkbenchController;
use Illuminate\Support\Facades\Route;

Route::redirect('/', '/workbench');

Route::get('/workbench', [WorkbenchController::class, 'index'])->name('workbench.index');
Route::post('/workbench/demos', [WorkbenchController::class, 'store'])->name('workbench.demos.store');
Route::post('/workbench/demos/{demo}/regenerate', [WorkbenchController::class, 'regenerate'])->name('workbench.demos.regenerate');
Route::post('/api/workbench/demos/generate-stream', [WorkbenchController::class, 'storeStream'])->name('api.workbench.demos.generate-stream');
Route::post('/api/workbench/demos/{demo}/regenerate-stream', [WorkbenchController::class, 'regenerateStream'])->name('api.workbench.demos.regenerate-stream');
Route::post('/api/workbench/demos/{demo}/refine-draft-stream', [WorkbenchController::class, 'refineDraftStream'])->name('api.workbench.demos.refine-draft-stream');

Route::get('/demos/{demo}/preview', [DemoController::class, 'preview'])->name('demos.preview');

Route::prefix('api')->group(function () {
    Route::get('/demos/{demo}/annotations', [AnnotationController::class, 'index'])->name('api.demos.annotations.index');
    Route::post('/demos/{demo}/annotations', [AnnotationController::class, 'store'])->name('api.demos.annotations.store');
    Route::patch('/annotations/{annotation}', [AnnotationController::class, 'update'])->name('api.annotations.update');
    Route::delete('/annotations/{annotation}', [AnnotationController::class, 'destroy'])->name('api.annotations.destroy');
    Route::post('/annotations/{annotation}/revise', [AnnotationController::class, 'revise'])->name('api.annotations.revise');

    Route::get('/demos/{demo}/versions', [VersionController::class, 'index'])->name('api.demos.versions.index');
    Route::post('/demos/{demo}/versions/{version}/restore', [VersionController::class, 'restore'])->name('api.demos.versions.restore');
});
