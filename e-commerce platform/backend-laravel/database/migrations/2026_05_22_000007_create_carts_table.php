<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('carts', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('user_id');
            $table->enum('active_role', ['individual', 'enterprise']);
            $table->timestamps();

            $table->unique(['user_id', 'active_role']);
        });

        Schema::create('cart_items', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('cart_id');
            $table->unsignedBigInteger('sku_id');
            $table->unsignedInteger('qty');
            $table->tinyInteger('selected')->default(1);
            $table->decimal('snapshot_price', 10, 2)->nullable()->comment('加入时单价');
            $table->timestamps();

            $table->index('cart_id');
            $table->index('sku_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cart_items');
        Schema::dropIfExists('carts');
    }
};
