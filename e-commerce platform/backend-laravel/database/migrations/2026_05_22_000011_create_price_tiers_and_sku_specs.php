<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('price_tiers', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('sku_id');
            $table->unsignedInteger('min_qty');
            $table->unsignedInteger('max_qty')->nullable()->comment('NULL 表示无上限');
            $table->decimal('unit_price', 10, 2);
            $table->integer('sort_order')->default(0);
            $table->timestamps();

            $table->index(['sku_id', 'min_qty']);
        });

        Schema::create('sku_specs', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('sku_id');
            $table->string('spec_key', 64)->comment('如 thickness/length/color');
            $table->string('spec_value', 128);
            $table->string('spec_unit', 16)->nullable();
            $table->timestamps();

            $table->index('sku_id');
            $table->index('spec_key');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sku_specs');
        Schema::dropIfExists('price_tiers');
    }
};
