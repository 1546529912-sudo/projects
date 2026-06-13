<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('companies', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('user_id')->comment('认证发起人');
            $table->string('name', 128);
            $table->string('credit_code', 20)->unique()->comment('统一社会信用代码');
            $table->string('license_url', 512)->comment('营业执照文件 URL');
            $table->string('contact_name', 64);
            $table->string('contact_phone', 20);
            $table->enum('status', ['pending', 'approved', 'rejected'])->default('pending');
            $table->string('reject_reason', 512)->nullable();
            $table->unsignedBigInteger('reviewer_id')->nullable();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();

            $table->index('user_id');
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('companies');
    }
};
