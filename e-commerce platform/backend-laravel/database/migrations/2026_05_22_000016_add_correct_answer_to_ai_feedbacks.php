<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('ai_feedbacks', function (Blueprint $table) {
            // 运营在后台标注时直接写的"正确答案"；JSONL 导出时作为 assistant 训练目标
            $table->text('correct_answer')->nullable()->after('reason');
        });
    }

    public function down(): void
    {
        Schema::table('ai_feedbacks', function (Blueprint $table) {
            $table->dropColumn('correct_answer');
        });
    }
};
