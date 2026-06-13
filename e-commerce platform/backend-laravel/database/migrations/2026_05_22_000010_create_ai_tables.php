<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ai_conversations', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('user_id')->nullable();
            $table->string('session_id', 64);
            $table->enum('source', ['detail_page', 'global_chat', 'inquiry_form', 'floating'])->default('floating');
            $table->enum('intent', ['quotation', 'presale', 'order', 'aftersale', 'chitchat', 'other'])->nullable();
            $table->json('context_json')->nullable()->comment('已采集参数 / 商品上下文');
            $table->tinyInteger('transferred')->default(0);
            $table->timestamp('transferred_at')->nullable();
            $table->tinyInteger('is_business')->default(1);
            $table->timestamps();

            $table->index('user_id');
            $table->index('session_id');
            $table->index('source');
        });

        Schema::create('ai_messages', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('conversation_id');
            $table->enum('sender_type', ['user', 'ai', 'human']);
            $table->text('content');
            $table->decimal('confidence', 5, 2)->nullable();
            $table->json('meta')->nullable()->comment('附加：召回知识 / 报价单 ID / transfer_to_human 等');
            $table->timestamps();

            $table->index(['conversation_id', 'created_at']);
        });

        Schema::create('ai_quotations', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->string('quotation_no', 32)->unique();
            $table->unsignedBigInteger('conversation_id')->nullable();
            $table->unsignedBigInteger('user_id');
            $table->json('items')->comment('报价单明细：{ sku_id, sku_code, name, qty, unit_price, total }');
            $table->decimal('total_amount', 10, 2);
            $table->timestamp('valid_until');
            $table->enum('status', ['active', 'used', 'expired', 'cancelled'])->default('active');
            $table->string('pdf_url', 512)->nullable();
            $table->unsignedBigInteger('order_id')->nullable()->comment('转下单后关联');
            $table->string('remark', 512)->nullable();
            $table->timestamps();

            $table->index(['user_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_quotations');
        Schema::dropIfExists('ai_messages');
        Schema::dropIfExists('ai_conversations');
    }
};
