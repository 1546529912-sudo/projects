<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('products', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('category_id');
            $table->string('name', 255);
            $table->string('model', 128);
            $table->string('keywords', 512)->nullable();
            $table->string('main_image_url', 512)->nullable();
            $table->json('detail_images')->nullable();
            $table->text('description')->nullable();
            $table->string('spec_pdf_url', 512)->nullable();
            $table->enum('status', ['draft', 'active', 'inactive'])->default('draft');
            $table->unsignedBigInteger('view_count')->default(0);
            $table->timestamps();
            $table->softDeletes();

            $table->index('category_id');
            $table->index('status');
            // FULLTEXT 仅 MySQL 支持，迁移时按需 raw 添加
        });

        if (config('database.default') === 'mysql') {
            \DB::statement('ALTER TABLE products ADD FULLTEXT ft_search (name, model, keywords)');
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};
