<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('annotations', function (Blueprint $table) {
            $table->decimal('iframe_scroll_x', 10, 2)->nullable()->after('y_percent');
            $table->decimal('iframe_scroll_y', 10, 2)->nullable()->after('iframe_scroll_x');
        });
    }

    public function down(): void
    {
        Schema::table('annotations', function (Blueprint $table) {
            $table->dropColumn(['iframe_scroll_x', 'iframe_scroll_y']);
        });
    }
};
