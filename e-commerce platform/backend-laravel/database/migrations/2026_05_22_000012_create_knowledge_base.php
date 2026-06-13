<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('knowledge_base', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->string('title', 255);
            $table->text('content');
            $table->string('category', 64);
            $table->string('keywords', 512)->nullable();
            $table->string('source', 255)->nullable()->comment('来源标注：如 T700 规格书 v2.1');
            $table->enum('status', ['draft', 'pending_review', 'active', 'disabled'])->default('active');
            $table->unsignedBigInteger('author_id')->nullable();
            $table->timestamps();

            $table->index('category');
            $table->index('status');
        });

        // SQLite FTS5 虚拟表 + 触发器同步
        // ai-service 直接读这个，业务侧 Eloquent 不依赖 FTS
        if (DB::connection()->getDriverName() === 'sqlite') {
            DB::statement("
                CREATE VIRTUAL TABLE IF NOT EXISTS knowledge_base_fts USING fts5(
                    title, content, keywords, category,
                    content='knowledge_base',
                    content_rowid='id',
                    tokenize='unicode61'
                )
            ");
            // 三个触发器保证 FTS 自动同步业务表
            DB::statement("
                CREATE TRIGGER IF NOT EXISTS kb_ai AFTER INSERT ON knowledge_base BEGIN
                    INSERT INTO knowledge_base_fts(rowid, title, content, keywords, category)
                    VALUES (new.id, new.title, new.content, new.keywords, new.category);
                END
            ");
            DB::statement("
                CREATE TRIGGER IF NOT EXISTS kb_ad AFTER DELETE ON knowledge_base BEGIN
                    INSERT INTO knowledge_base_fts(knowledge_base_fts, rowid, title, content, keywords, category)
                    VALUES('delete', old.id, old.title, old.content, old.keywords, old.category);
                END
            ");
            DB::statement("
                CREATE TRIGGER IF NOT EXISTS kb_au AFTER UPDATE ON knowledge_base BEGIN
                    INSERT INTO knowledge_base_fts(knowledge_base_fts, rowid, title, content, keywords, category)
                    VALUES('delete', old.id, old.title, old.content, old.keywords, old.category);
                    INSERT INTO knowledge_base_fts(rowid, title, content, keywords, category)
                    VALUES (new.id, new.title, new.content, new.keywords, new.category);
                END
            ");
        }
    }

    public function down(): void
    {
        if (DB::connection()->getDriverName() === 'sqlite') {
            DB::statement('DROP TRIGGER IF EXISTS kb_au');
            DB::statement('DROP TRIGGER IF EXISTS kb_ad');
            DB::statement('DROP TRIGGER IF EXISTS kb_ai');
            DB::statement('DROP TABLE IF EXISTS knowledge_base_fts');
        }
        Schema::dropIfExists('knowledge_base');
    }
};
