<?php

namespace App\Providers;

use App\Contracts\StockManager;
use App\Services\Stock\InMemoryStockManager;
use App\Services\Stock\RedisStockManager;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->singleton(StockManager::class, function ($app) {
            return $app->environment('testing')
                ? new InMemoryStockManager()
                : new RedisStockManager();
        });
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        //
    }
}
