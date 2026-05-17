<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ai_logs', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id')->nullable()->index();
            $table->string('task_type', 50);
            // task_type: extract | split | report_generate
            $table->string('model_name', 100);
            $table->text('prompt_content');
            $table->text('input_content');
            $table->text('output_content');
            $table->boolean('is_success')->default(false);
            $table->unsignedTinyInteger('retry_count')->default(0);
            $table->unsignedInteger('duration_ms')->default(0);
            $table->unsignedInteger('token_usage')->default(0);
            $table->timestamps();

            $table->index(['task_type', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_logs');
    }
};
