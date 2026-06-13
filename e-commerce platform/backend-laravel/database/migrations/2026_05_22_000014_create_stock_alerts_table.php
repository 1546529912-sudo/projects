<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('stock_alerts', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('sku_id')->index();
            $table->unsignedInteger('current_stock');
            $table->unsignedInteger('threshold');
            $table->enum('status', ['open', 'resolved'])->default('open')->index();
            $table->enum('webhook_status', ['pending', 'mock_only', 'sent', 'failed'])->default('pending');
            $table->text('webhook_response')->nullable();
            $table->timestamp('triggered_at')->useCurrent();
            $table->timestamp('resolved_at')->nullable();
            $table->timestamps();
            // 同一 SKU 同时只能有一条 open（多条 resolved 历史不冲突），靠 Service 层 firstOrCreate 保证
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_alerts');
    }
};
