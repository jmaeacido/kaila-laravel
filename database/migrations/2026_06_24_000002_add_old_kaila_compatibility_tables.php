<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('push_tokens', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->text('token');
            $table->string('token_hash', 128)->unique();
            $table->string('platform', 40)->default('android');
            $table->string('device_id', 120)->nullable();
            $table->timestamps();

            $table->index(['user_id', 'updated_at']);
        });

        Schema::create('user_blocks', function (Blueprint $table) {
            $table->foreignId('blocker_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('blocked_id')->constrained('users')->cascadeOnDelete();
            $table->text('reason')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->primary(['blocker_id', 'blocked_id']);
        });

        Schema::create('direct_messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sender_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('recipient_id')->constrained('users')->cascadeOnDelete();
            $table->text('body');
            $table->string('kind', 24)->default('text');
            $table->json('call_metadata')->nullable();
            $table->timestamps();

            $table->index(['sender_id', 'recipient_id', 'created_at']);
            $table->index(['recipient_id', 'sender_id', 'created_at']);
        });

        Schema::create('message_read_states', function (Blueprint $table) {
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('scope', 20);
            $table->string('thread_id', 160);
            $table->timestamp('read_at');

            $table->primary(['user_id', 'scope', 'thread_id']);
        });

        Schema::create('notification_read_states', function (Blueprint $table) {
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('type', 40);
            $table->timestamp('read_at');

            $table->primary(['user_id', 'type']);
        });

        Schema::create('activities', function (Blueprint $table) {
            $table->id();
            $table->string('title', 160);
            $table->text('detail');
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('missed_calls', function (Blueprint $table) {
            $table->id();
            $table->foreignId('caller_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('recipient_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('service_request_id')->nullable()->constrained()->nullOnDelete();
            $table->string('caller_name', 160);
            $table->string('call_type', 20)->default('audio');
            $table->string('context_title')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['recipient_id', 'created_at']);
        });

        Schema::create('job_navigation_states', function (Blueprint $table) {
            $table->foreignId('service_request_id')->primary()->constrained()->cascadeOnDelete();
            $table->foreignId('provider_id')->constrained('users')->cascadeOnDelete();
            $table->string('status', 30)->default('waiting');
            $table->decimal('provider_lat', 10, 7)->nullable();
            $table->decimal('provider_lng', 10, 7)->nullable();
            $table->decimal('destination_lat', 10, 7)->nullable();
            $table->decimal('destination_lng', 10, 7)->nullable();
            $table->unsignedInteger('distance_meters')->nullable();
            $table->unsignedInteger('eta_minutes')->nullable();
            $table->string('arrival_state', 30)->default('waiting');
            $table->timestamp('started_at')->nullable();
            $table->timestamp('last_location_at')->nullable();
            $table->timestamp('stopped_at')->nullable();
            $table->timestamps();
        });

        Schema::create('validation_entries', function (Blueprint $table) {
            $table->id();
            $table->string('type', 40);
            $table->foreignId('operator_id')->constrained('users')->cascadeOnDelete();
            $table->json('responses');
            $table->string('decision_signal', 40)->default('Neutral');
            $table->text('decision_reason')->nullable();
            $table->timestamps();

            $table->index(['type', 'created_at']);
        });

        Schema::create('feed_post_reactions', function (Blueprint $table) {
            $table->foreignId('feed_post_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('reaction', 40);
            $table->timestamp('created_at')->useCurrent();

            $table->primary(['feed_post_id', 'user_id', 'reaction']);
        });

        Schema::create('feed_post_comments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('feed_post_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('parent_comment_id')->nullable()->constrained('feed_post_comments')->cascadeOnDelete();
            $table->text('body');
            $table->timestamps();

            $table->index(['feed_post_id', 'created_at']);
        });

        Schema::create('audit_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('actor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('actor_role', 40)->nullable();
            $table->string('action', 120);
            $table->json('metadata')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
        Schema::dropIfExists('feed_post_comments');
        Schema::dropIfExists('feed_post_reactions');
        Schema::dropIfExists('validation_entries');
        Schema::dropIfExists('job_navigation_states');
        Schema::dropIfExists('missed_calls');
        Schema::dropIfExists('activities');
        Schema::dropIfExists('notification_read_states');
        Schema::dropIfExists('message_read_states');
        Schema::dropIfExists('direct_messages');
        Schema::dropIfExists('user_blocks');
        Schema::dropIfExists('push_tokens');
    }
};
