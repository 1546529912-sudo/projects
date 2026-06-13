<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payments', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('order_id');
            $table->string('payment_no', 64)->unique();
            $table->enum('method', ['wechat', 'alipay', 'bank_transfer']);
            $table->decimal('amount', 10, 2);
            $table->enum('status', ['pending', 'success', 'failed', 'refunded'])->default('pending');
            $table->string('transaction_id', 128)->nullable()->unique()->comment('第三方流水号或 mock');
            $table->string('voucher_url', 512)->nullable()->comment('对公转账凭证');
            $table->timestamp('paid_at')->nullable();
            $table->unsignedBigInteger('reviewed_by')->nullable();
            $table->timestamp('reviewed_at')->nullable();
            $table->string('reject_reason', 512)->nullable();
            $table->timestamps();

            $table->index(['order_id', 'status']);
        });

        // 给 orders 表加发货字段（之前漏了）
        Schema::table('orders', function (Blueprint $table) {
            $table->string('tracking_company', 64)->nullable()->after('shipping_method');
            $table->string('tracking_no', 64)->nullable()->after('tracking_company');
            $table->timestamp('shipped_at')->nullable()->after('paid_at');
            $table->timestamp('received_at')->nullable()->after('shipped_at');
            $table->timestamp('completed_at')->nullable()->after('received_at');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn(['tracking_company', 'tracking_no', 'shipped_at', 'received_at', 'completed_at']);
        });
        Schema::dropIfExists('payments');
    }
};
