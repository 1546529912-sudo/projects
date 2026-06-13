<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->singleton(\App\Services\DeepSeekClient::class, fn () => \App\Services\DeepSeekClient::fromConfig());
        $this->app->singleton(\App\Services\RequirementScopeService::class, function ($app) {
            return new \App\Services\RequirementScopeService(
                $app->make(\App\Services\DeepSeekClient::class)
            );
        });

        $this->app->singleton(\App\Services\DemoGenerationService::class, function ($app) {
            return new \App\Services\DemoGenerationService(
                $app->make(\App\Services\DeepSeekClient::class),
                $app->make(\App\Services\RequirementScopeService::class)
            );
        });

        $this->app->singleton(\App\Services\DemoRevisionService::class, function ($app) {
            return new \App\Services\DemoRevisionService(
                $app->make(\App\Services\DeepSeekClient::class),
                $app->make(\App\Services\RequirementScopeService::class)
            );
        });

        $this->app->singleton(\App\Services\DemoRegenerationService::class, function ($app) {
            return new \App\Services\DemoRegenerationService(
                $app->make(\App\Services\DeepSeekClient::class)
            );
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
