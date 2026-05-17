<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('prompt_templates', function (Blueprint $table) {
            $table->id();
            $table->string('template_type', 50);
            // template_type: extract | split | report
            $table->string('template_name', 100);
            $table->text('prompt_content');
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['template_type', 'is_active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('prompt_templates');
    }
};
