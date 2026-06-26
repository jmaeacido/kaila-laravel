<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AdminModulesTest extends TestCase
{
    use RefreshDatabase;

    public function test_regular_admin_cannot_create_admin_but_super_admin_can(): void
    {
        $admin = $this->user('admin', 'regular-admin');
        $superAdmin = $this->user('admin', User::SUPER_ADMIN_USERNAME);

        $payload = [
            'name' => 'New Admin',
            'username' => 'new-admin',
            'email' => 'new-admin@example.test',
            'password' => 'Password123!',
            'role' => 'admin',
        ];

        $this->actingAs($admin)->postJson('/api/admin/users', $payload)->assertForbidden();

        $this->actingAs($superAdmin)->postJson('/api/admin/users', $payload)->assertCreated();
        $this->assertDatabaseHas('users', ['username' => 'new-admin', 'role' => 'admin']);
        $this->assertDatabaseHas('audit_logs', ['actor_id' => $superAdmin->id, 'action' => 'account.create']);
    }

    public function test_customer_service_can_review_reports_but_ops_cannot(): void
    {
        $support = $this->user('customer_service', 'support-agent');
        $ops = $this->user('ops', 'ops-agent');
        $reporter = $this->user('client', 'reporter');
        $reported = $this->user('provider', 'reported');
        $reportId = DB::table('moderation_reports')->insertGetId([
            'reporter_id' => $reporter->id,
            'reported_user_id' => $reported->id,
            'type' => 'user',
            'reason' => 'Unsafe behavior',
            'details' => 'Test report',
            'status' => 'Open',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->actingAs($ops)->postJson("/api/reports/{$reportId}/action", ['status' => 'Closed'])->assertForbidden();
        $this->actingAs($support)->postJson("/api/reports/{$reportId}/action", ['status' => 'Closed'])->assertOk();

        $this->assertDatabaseHas('moderation_reports', ['id' => $reportId, 'status' => 'Closed']);
    }

    public function test_ops_can_manage_validation_but_cannot_load_analytics(): void
    {
        $ops = $this->user('ops', 'validator');

        $this->actingAs($ops)->postJson('/api/analytics/insights')->assertForbidden();
        $this->actingAs($ops)->postJson('/api/validation', [
            'type' => 'client_survey',
            'responses' => ['name' => 'Alex D.', 'score' => 5],
            'decision_signal' => 'Approve',
        ])->assertCreated();

        $this->assertDatabaseHas('validation_entries', ['operator_id' => $ops->id, 'decision_signal' => 'Approve']);
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
