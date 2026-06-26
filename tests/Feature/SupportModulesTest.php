<?php

namespace Tests\Feature;

use App\Models\ServiceRequest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class SupportModulesTest extends TestCase
{
    use RefreshDatabase;

    public function test_customer_service_receives_support_scoped_state(): void
    {
        $support = $this->user('customer_service', 'support-agent');
        $client = $this->user('client', 'client-one');
        $provider = $this->user('provider', 'provider-one');

        $disputed = $this->serviceRequest($client, $provider, ['status' => 'Disputed']);

        $this->serviceRequest($client, null, ['status' => 'Posted']);

        $response = $this->actingAs($support)->getJson('/api/state')->assertOk();

        $response->assertJsonPath('metrics.support.queueCount', 1);
        $response->assertJsonPath('badgeCounts.supportQueue', 1);
        $response->assertJsonPath('support.permissions.canResolveDisputes', true);
        $response->assertJsonCount(1, 'requests');
        $this->assertSame($disputed->id, $response->json('requests.0.id'));
    }

    public function test_admin_can_triage_reports_but_not_resolve_disputes(): void
    {
        $admin = $this->user('admin', 'regular-admin');
        $support = $this->user('customer_service', 'support-agent');
        $client = $this->user('client', 'client-two');
        $provider = $this->user('provider', 'provider-two');

        $request = $this->serviceRequest($client, $provider, ['status' => 'Disputed']);

        $reportId = DB::table('moderation_reports')->insertGetId([
            'reporter_id' => $client->id,
            'reported_user_id' => $provider->id,
            'service_request_id' => $request->id,
            'type' => 'job',
            'reason' => 'Unsafe behavior',
            'details' => 'Test report',
            'status' => 'Open',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->actingAs($admin)->postJson("/api/reports/{$reportId}/action", ['status' => 'In Review'])->assertOk();
        $this->actingAs($admin)->postJson("/api/requests/{$request->id}/action", ['action' => 'resolve_dispute'])->assertForbidden();
        $this->actingAs($support)->postJson("/api/requests/{$request->id}/action", ['action' => 'resolve_dispute'])->assertOk();
    }

    public function test_customer_service_can_run_support_dispute_outcomes(): void
    {
        $support = $this->user('customer_service', 'support-agent');
        $client = $this->user('client', 'client-three');
        $provider = $this->user('provider', 'provider-three');

        $request = $this->serviceRequest($client, $provider, ['status' => 'Disputed']);

        $this->actingAs($support)->postJson("/api/requests/{$request->id}/action", [
            'action' => 'support_resume_job',
            'note' => 'Resume after review.',
        ])->assertOk();

        $this->assertDatabaseHas('service_requests', [
            'id' => $request->id,
            'status' => 'In Progress',
        ]);
    }

    public function test_ops_cannot_access_support_report_triage_or_notes(): void
    {
        $ops = $this->user('ops', 'ops-agent');
        $client = $this->user('client', 'client-four');
        $provider = $this->user('provider', 'provider-four');

        $reportId = DB::table('moderation_reports')->insertGetId([
            'reporter_id' => $client->id,
            'reported_user_id' => $provider->id,
            'type' => 'user',
            'reason' => 'Unsafe behavior',
            'details' => 'Test report',
            'status' => 'Open',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->actingAs($ops)->postJson("/api/reports/{$reportId}/action", ['status' => 'Closed'])->assertForbidden();
        $this->actingAs($ops)->postJson('/api/activity', ['detail' => 'Ops note'])->assertForbidden();
    }

    public function test_marketplace_users_can_message_support_desk(): void
    {
        $support = $this->user('customer_service', 'support-desk');
        $client = $this->user('client', 'client-five');

        $this->actingAs($client)->postJson("/api/direct-conversations/{$support->id}/messages", [
            'body' => 'Need help with my job.',
        ])->assertCreated();

        $this->actingAs($support)->getJson("/api/direct-conversations/{$client->id}/messages")->assertOk()
            ->assertJsonCount(1, 'messages');
    }

    public function test_support_cannot_write_job_chat_but_can_read_disputed_job_chat(): void
    {
        $support = $this->user('customer_service', 'support-agent');
        $client = $this->user('client', 'client-six');
        $provider = $this->user('provider', 'provider-six');

        $request = $this->serviceRequest($client, $provider, ['status' => 'Disputed']);

        $this->actingAs($support)->getJson("/api/requests/{$request->id}/messages")->assertOk();
        $this->actingAs($support)->postJson("/api/requests/{$request->id}/messages", [
            'body' => 'Support note in job chat',
        ])->assertForbidden();
    }

    public function test_super_admin_can_create_customer_service_account(): void
    {
        $superAdmin = $this->user('admin', User::SUPER_ADMIN_USERNAME);

        $this->actingAs($superAdmin)->postJson('/api/admin/users', [
            'name' => 'Support Agent',
            'username' => 'new-support',
            'email' => 'new-support@example.test',
            'password' => 'Password123!',
            'role' => 'customer_service',
        ])->assertCreated();

        $this->assertDatabaseHas('users', ['username' => 'new-support', 'role' => 'customer_service']);
    }

    private function serviceRequest(User $client, ?User $provider = null, array $overrides = []): ServiceRequest
    {
        return ServiceRequest::create(array_merge([
            'client_id' => $client->id,
            'accepted_provider_id' => $provider?->id,
            'category' => 'Electrical',
            'urgency' => 'Today',
            'area' => 'Gingoog City',
            'budget' => 'PHP 800',
            'preferred_schedule' => 'Afternoon',
            'contact_method' => 'Chat first',
            'details' => 'Support test request',
            'status' => 'Accepted',
            'permission_to_forward' => true,
            'consent_to_rate' => true,
        ], $overrides));
    }

    private function user(string $role, string $username): User
    {
        return User::factory()->create([
            'name' => str($username)->replace('-', ' ')->title(),
            'username' => $username,
            'email' => "{$username}@example.test",
            'password' => Hash::make('Password123!'),
            'role' => $role,
            'account_status' => 'active',
            'data_privacy_consent' => true,
        ]);
    }
}
