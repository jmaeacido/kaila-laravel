<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('request_attachments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignId('service_request_id')->constrained()->cascadeOnDelete();
            $table->string('stage', 30)->default('request');
            $table->string('file_name');
            $table->string('original_name');
            $table->string('mime_type', 120);
            $table->unsignedInteger('size_bytes');
            $table->timestamp('created_at')->useCurrent();
            $table->index(['service_request_id', 'stage']);
        });

        Schema::create('job_message_attachments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignId('job_message_id')->constrained()->cascadeOnDelete();
            $table->string('file_name');
            $table->string('original_name');
            $table->string('mime_type', 120);
            $table->unsignedInteger('size_bytes');
            $table->timestamp('created_at')->useCurrent();
        });

        Schema::create('direct_message_attachments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignId('direct_message_id')->constrained()->cascadeOnDelete();
            $table->string('file_name');
            $table->string('original_name');
            $table->string('mime_type', 120);
            $table->unsignedInteger('size_bytes');
            $table->timestamp('created_at')->useCurrent();
        });

        Schema::create('feed_post_media', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignId('feed_post_id')->constrained()->cascadeOnDelete();
            $table->string('file_name');
            $table->string('original_name');
            $table->string('mime_type', 120);
            $table->unsignedInteger('size_bytes');
            $table->unsignedInteger('share_count')->default(0);
            $table->timestamp('created_at')->useCurrent();
            $table->index(['feed_post_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('feed_post_media');
        Schema::dropIfExists('direct_message_attachments');
        Schema::dropIfExists('job_message_attachments');
        Schema::dropIfExists('request_attachments');
    }
};
