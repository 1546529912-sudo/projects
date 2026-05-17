<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('work_records', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id')->index();
            $table->string('audio_path')->nullable();
            $table->text('raw_text')->nullable();
            $table->json('ai_result')->nullable();
            $table->string('status', 30)->default('uploaded');
            // status: uploaded | transcribed | extracted | saved
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('work_records');
    }
};
