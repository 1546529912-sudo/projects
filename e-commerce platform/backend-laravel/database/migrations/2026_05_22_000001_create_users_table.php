<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->string('phone', 20)->nullable()->unique()->comment('手机号');
            $table->string('password', 255)->nullable()->comment('bcrypt 加密');
            $table->string('wechat_openid', 64)->nullable()->unique();
            $table->string('wechat_unionid', 64)->nullable();
            $table->string('name', 64)->nullable();
            $table->string('email', 128)->nullable();
            $table->string('avatar_url', 512)->nullable();
            $table->enum('role', ['individual', 'enterprise', 'admin'])->default('individual');
            $table->enum('active_role', ['individual', 'enterprise'])->default('individual');
            $table->unsignedBigInteger('company_id')->nullable();
            $table->enum('status', ['active', 'locked', 'disabled'])->default('active');
            $table->timestamp('last_login_at')->nullable();
            $table->string('last_login_ip', 45)->nullable();
            $table->rememberToken();
            $table->timestamps();
            $table->softDeletes();

            $table->index('company_id');
            $table->index(['role', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('users');
    }
};
