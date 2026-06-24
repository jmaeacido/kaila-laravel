<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('provider_profiles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('display_name')->nullable();
            $table->string('provider_type')->nullable();
            $table->string('category');
            $table->text('specific_services')->nullable();
            $table->string('area');
            $table->text('coverage_area')->nullable();
            $table->string('availability')->default('Available');
            $table->string('emergency_availability')->nullable();
            $table->string('years_experience')->nullable();
            $table->text('skills')->nullable();
            $table->string('minimum_fee')->nullable();
            $table->text('price_range')->nullable();
            $table->boolean('rules_agreement')->default(false);
            $table->string('trust_level')->default('Listed');
            $table->string('status')->default('Active')->index();
            $table->timestamps();

            $table->index(['category', 'status']);
            $table->index('area');
        });

        Schema::create('service_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('client_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('accepted_provider_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('category')->index();
            $table->string('urgency')->default('Today')->index();
            $table->string('area')->index();
            $table->string('budget')->nullable();
            $table->string('preferred_schedule')->nullable();
            $table->string('contact_method')->nullable();
            $table->text('exact_location_notes')->nullable();
            $table->decimal('job_lat', 10, 7)->nullable();
            $table->decimal('job_lng', 10, 7)->nullable();
            $table->string('job_location_source')->nullable();
            $table->boolean('permission_to_forward')->default(false);
            $table->boolean('consent_to_rate')->default(false);
            $table->text('details');
            $table->string('status')->default('Posted')->index();
            $table->timestamp('confirmed_at')->nullable();
            $table->timestamp('provider_started_at')->nullable();
            $table->timestamp('provider_done_at')->nullable();
            $table->timestamp('auto_confirm_at')->nullable()->index();
            $table->timestamp('payment_released_at')->nullable();
            $table->timestamp('rating_deadline_at')->nullable();
            $table->text('proof_note')->nullable();
            $table->text('revision_note')->nullable();
            $table->text('dispute_note')->nullable();
            $table->unsignedTinyInteger('client_rating_score')->nullable();
            $table->text('client_rating_note')->nullable();
            $table->timestamp('client_rated_at')->nullable();
            $table->unsignedTinyInteger('provider_rating_score')->nullable();
            $table->text('provider_rating_note')->nullable();
            $table->timestamp('provider_rated_at')->nullable();
            $table->timestamps();

            $table->index(['status', 'created_at']);
            $table->index(['client_id', 'status']);
            $table->index(['accepted_provider_id', 'status']);
        });

        Schema::create('offers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('service_request_id')->constrained()->cascadeOnDelete();
            $table->foreignId('provider_id')->constrained('users')->cascadeOnDelete();
            $table->string('type', 20)->default('offer');
            $table->string('amount');
            $table->string('schedule')->nullable();
            $table->text('notes')->nullable();
            $table->decimal('provider_lat', 10, 7)->nullable();
            $table->decimal('provider_lng', 10, 7)->nullable();
            $table->timestamp('provider_location_captured_at')->nullable();
            $table->string('status', 40)->default('sent')->index();
            $table->timestamps();

            $table->index(['service_request_id', 'created_at']);
            $table->index(['provider_id', 'created_at']);
        });

        Schema::create('job_messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('service_request_id')->constrained()->cascadeOnDelete();
            $table->foreignId('sender_id')->constrained('users')->cascadeOnDelete();
            $table->text('body');
            $table->string('kind', 24)->default('text');
            $table->json('call_metadata')->nullable();
            $table->timestamps();

            $table->index(['service_request_id', 'created_at']);
            $table->index(['sender_id', 'created_at']);
        });

        Schema::create('job_message_reactions', function (Blueprint $table) {
            $table->foreignId('job_message_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('reaction', 40);
            $table->timestamp('created_at')->useCurrent();

            $table->primary(['job_message_id', 'user_id', 'reaction']);
        });

        Schema::create('request_passes', function (Blueprint $table) {
            $table->foreignId('service_request_id')->constrained()->cascadeOnDelete();
            $table->foreignId('provider_id')->constrained('users')->cascadeOnDelete();
            $table->timestamp('created_at')->useCurrent();

            $table->primary(['service_request_id', 'provider_id']);
        });

        Schema::create('notifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('actor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('service_request_id')->nullable()->constrained()->cascadeOnDelete();
            $table->string('type', 60)->index();
            $table->string('title');
            $table->text('body')->nullable();
            $table->json('data')->nullable();
            $table->timestamp('read_at')->nullable()->index();
            $table->timestamps();

            $table->index(['user_id', 'read_at', 'created_at']);
        });

        Schema::create('push_subscriptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->text('endpoint');
            $table->string('endpoint_hash', 128)->unique();
            $table->string('public_key')->nullable();
            $table->string('auth_token')->nullable();
            $table->string('content_encoding', 40)->default('aes128gcm');
            $table->string('device_name')->nullable();
            $table->timestamp('last_success_at')->nullable();
            $table->timestamp('last_failure_at')->nullable();
            $table->text('last_error')->nullable();
            $table->timestamps();
        });

        Schema::create('moderation_reports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('reporter_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('reported_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('service_request_id')->nullable()->constrained()->nullOnDelete();
            $table->string('type', 20);
            $table->string('reason');
            $table->text('details')->nullable();
            $table->string('status', 40)->default('Open')->index();
            $table->timestamps();
        });

        Schema::create('feed_posts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('author_id')->constrained('users')->cascadeOnDelete();
            $table->text('body');
            $table->string('visibility', 20)->default('public')->index();
            $table->unsignedInteger('share_count')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('feed_posts');
        Schema::dropIfExists('moderation_reports');
        Schema::dropIfExists('push_subscriptions');
        Schema::dropIfExists('notifications');
        Schema::dropIfExists('request_passes');
        Schema::dropIfExists('job_message_reactions');
        Schema::dropIfExists('job_messages');
        Schema::dropIfExists('offers');
        Schema::dropIfExists('service_requests');
        Schema::dropIfExists('provider_profiles');
    }
};
