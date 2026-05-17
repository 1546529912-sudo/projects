<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('daily_reports', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id')->index();
            $table->date('report_date');
            $table->json('content');
            $table->string('template', 20)->default('personal');
            // template: personal | formal
            $table->text('personal_text')->nullable();
            $table->text('formal_text')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['user_id', 'report_date']); // 每用户每天只有一份日报
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('daily_reports');
    }
};
