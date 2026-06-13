<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('logistics_tracks', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('order_id');
            $table->string('node', 64)->comment('节点：accepted/transit/dispatching/delivered');
            $table->string('location', 128)->nullable();
            $table->string('description', 255);
            $table->timestamp('occurred_at');
            $table->timestamps();

            $table->index(['order_id', 'occurred_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('logistics_tracks');
    }
};
