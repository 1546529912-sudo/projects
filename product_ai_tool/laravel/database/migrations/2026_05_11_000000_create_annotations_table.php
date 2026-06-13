<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('annotations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('demo_id')->constrained('demos')->cascadeOnDelete();
            $table->foreignId('demo_version_id')->constrained('demo_versions')->cascadeOnDelete();
            $table->string('page_key', 128);
            $table->string('state_key', 128)->nullable();
            $table->decimal('x_percent', 7, 4);
            $table->decimal('y_percent', 7, 4);
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('type', 32)->default('说明');
            $table->string('status', 32)->default('未处理');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('annotations');
    }
};
