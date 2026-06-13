<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('ai_feedbacks', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('message_id')->index();
            $table->unsignedBigInteger('conversation_id')->index();
            $table->unsignedBigInteger('user_id')->nullable()->comment('自动产生的可为空');
            $table->enum('rating', ['good', 'bad'])->index();
            $table->string('source', 32)->default('manual')
                ->comment('manual=用户主动 thumbs / auto_transfer=转人工自动 / auto_lowconf=低置信度自动');
            $table->string('reason', 512)->nullable();
            $table->json('tags')->nullable()->comment('标注用：[\"知识缺失\",\"价格错误\",\"理解偏差\"]');
            $table->tinyInteger('labeled')->default(0)->index();
            $table->timestamp('labeled_at')->nullable();
            $table->unsignedBigInteger('labeled_by')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_feedbacks');
    }
};
