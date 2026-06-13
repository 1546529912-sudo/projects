<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('orders', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->string('order_no', 32)->unique();
            $table->unsignedBigInteger('user_id');
            $table->enum('active_role', ['individual', 'enterprise']);
            $table->decimal('product_amount', 10, 2);
            $table->decimal('shipping_fee', 10, 2)->default(0);
            $table->decimal('discount_amount', 10, 2)->default(0);
            $table->decimal('total_amount', 10, 2);
            $table->decimal('paid_amount', 10, 2)->default(0);
            $table->enum('status', [
                'pending_payment', 'pending_review', 'pending_shipment', 'shipped',
                'received', 'completed', 'cancelled', 'refunding', 'refunded',
            ])->default('pending_payment');
            $table->enum('shipping_method', ['standard', 'express'])->default('standard');
            $table->json('shipping_address')->comment('地址快照');
            $table->string('remark', 512)->nullable();
            $table->string('cancel_reason', 255)->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'status']);
            $table->index(['status', 'created_at']);
        });

        Schema::create('order_items', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('order_id');
            $table->unsignedBigInteger('sku_id');
            $table->string('product_name', 255);
            $table->string('sku_code', 64);
            $table->string('product_image', 512)->nullable();
            $table->unsignedInteger('qty');
            $table->decimal('unit_price', 10, 2);
            $table->decimal('total_price', 10, 2);
            $table->timestamps();

            $table->index('order_id');
            $table->index('sku_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('order_items');
        Schema::dropIfExists('orders');
    }
};
