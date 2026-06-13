<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('addresses', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('user_id');
            $table->string('receiver_name', 64);
            $table->string('receiver_phone', 20);
            $table->string('province', 32);
            $table->string('city', 32);
            $table->string('district', 32);
            $table->string('detail', 255);
            $table->tinyInteger('is_default')->default(0);
            $table->timestamps();
            $table->softDeletes();

            $table->index('user_id');
            $table->index(['user_id', 'is_default']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('addresses');
    }
};
