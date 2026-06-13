<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('skus', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('product_id');
            $table->string('sku_code', 64)->unique();
            $table->decimal('base_price', 10, 2)->comment('基础单价');
            $table->unsignedInteger('stock')->default(0);
            $table->unsignedInteger('stock_threshold')->default(10);
            $table->enum('status', ['active', 'disabled'])->default('active');
            $table->timestamps();

            $table->index('product_id');
            $table->index('stock');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('skus');
    }
};
