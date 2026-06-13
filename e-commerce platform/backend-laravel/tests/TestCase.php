<?php

namespace Tests;

use App\Contracts\StockManager;
use App\Services\Stock\InMemoryStockManager;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        // 每个 test 重置 StockManager singleton，避免 InMemory 内部数组跨 test 泄漏
        $this->app->singleton(StockManager::class, fn () => new InMemoryStockManager());
    }
}
