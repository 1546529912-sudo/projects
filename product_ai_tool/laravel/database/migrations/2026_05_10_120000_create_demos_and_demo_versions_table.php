<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('demos', function (Blueprint $table) {
            $table->id();
            $table->string('title')->nullable();
            $table->text('prompt');
            $table->string('model')->default('deepseek-v4-flash');
            $table->unsignedBigInteger('current_version_id')->nullable();
            $table->timestamps();
        });

        Schema::create('demo_versions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('demo_id')->constrained('demos')->cascadeOnDelete();
            $table->unsignedInteger('version_no');
            $table->longText('html_code');
            $table->string('model');
            $table->string('source_type')->default('initial_generate');
            $table->unsignedBigInteger('source_annotation_id')->nullable();
            $table->text('prompt')->nullable();
            $table->timestamps();
        });

        Schema::table('demos', function (Blueprint $table) {
            $table->foreign('current_version_id')
                ->references('id')
                ->on('demo_versions')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('demos', function (Blueprint $table) {
            $table->dropForeign(['current_version_id']);
        });
        Schema::dropIfExists('demo_versions');
        Schema::dropIfExists('demos');
    }
};
