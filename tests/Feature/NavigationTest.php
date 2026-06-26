<?php

namespace Tests\Feature;

use App\Models\ServiceRequest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class NavigationTest extends TestCase
{
    use RefreshDatabase;

    public function test_provider_can_start_navigation_for_accepted_job(): void
    {
        [$client, $provider, $request] = $this->acceptedJob();

        $this->actingAs($provider)
            ->postJson("/api/navigation/{$request->id}/start")
            ->assertOk()
            ->assertJsonPath('navigationState.status', 'traveling');

        $this->assertDatabaseHas('job_navigation_states', [
            'service_request_id' => $request->id,
            'provider_id' => $provider->id,
            'status' => 'traveling',
        ]);
    }

    public function test_navigation_start_is_rejected_for_disputed_jobs(): void
    {
        [$client, $provider, $request] = $this->acceptedJob(['status' => 'Disputed']);

        $this->actingAs($provider)
            ->postJson("/api/navigation/{$request->id}/start")
            ->assertStatus(422)
            ->assertJsonPath('message', 'Navigation is unavailable while the job is disputed.');
    }

    public function test_client_cannot_start_navigation(): void
    {
        [$client, $provider, $request] = $this->acceptedJob();

        $this->actingAs($client)
            ->postJson("/api/navigation/{$request->id}/start")
            ->assertForbidden();
    }

    private function acceptedJob(array $overrides = []): array
    {
        $client = User::factory()->create([
            'role' => 'client',
            'password' => Hash::make('Password123!'),
        ]);
        $provider = User::factory()->create([
            'role' => 'provider',
            'password' => Hash::make('Password123!'),
        ]);
        $request = ServiceRequest::create(array_merge([
            'client_id' => $client->id,
            'accepted_provider_id' => $provider->id,
            'category' => 'Electrical',
            'urgency' => 'Today',
            'area' => 'Gingoog City',
            'budget' => 'PHP 800',
            'preferred_schedule' => 'Afternoon',
            'contact_method' => 'Chat first',
            'details' => 'Navigation test request',
            'status' => 'Accepted',
            'permission_to_forward' => true,
            'consent_to_rate' => true,
            'job_lat' => 8.8223,
            'job_lng' => 125.1289,
        ], $overrides));

        return [$client, $provider, $request];
    }
}
