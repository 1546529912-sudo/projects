<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('categories', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('parent_id')->nullable();
            $table->string('name', 64);
            $table->string('slug', 64)->unique();
            $table->string('icon_url', 512)->nullable();
            $table->integer('sort_order')->default(0);
            $table->json('param_template')->nullable();
            $table->enum('status', ['active', 'disabled'])->default('active');
            $table->timestamps();

            $table->index('parent_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('categories');
    }
};
