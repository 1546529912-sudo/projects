<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('stock_alerts', function (Blueprint $table) {
            // iter-17 队列化：记录尝试次数，超过 tries 后标 failed
            $table->unsignedTinyInteger('webhook_attempts')->default(0)->after('webhook_response');
        });
    }

    public function down(): void
    {
        Schema::table('stock_alerts', function (Blueprint $table) {
            $table->dropColumn('webhook_attempts');
        });
    }
};
