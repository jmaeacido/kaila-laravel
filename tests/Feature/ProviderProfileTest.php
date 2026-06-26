<?php

namespace Tests\Feature;

use App\Models\ProviderProfile;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class ProviderProfileTest extends TestCase
{
    use RefreshDatabase;

    public function test_provider_can_save_extended_profile_fields(): void
    {
        $provider = User::factory()->create([
            'role' => 'provider',
            'password' => Hash::make('Password123!'),
        ]);

        $this->actingAs($provider)
            ->postJson('/api/providers', [
                'display_name' => 'Juan Electrical Works',
                'tagline' => 'Electrical Specialist',
                'provider_type' => 'Individual',
                'category' => 'Electrical',
                'specific_services' => 'Outlets, breakers, wiring',
                'about' => 'Reliable electrician with 5+ years of experience.',
                'area' => 'Gingoog City',
                'coverage_area' => 'Gingoog City, nearby barangays',
                'availability' => 'Mon - Sun, 8:00 AM - 6:00 PM',
                'emergency_availability' => 'Available 24/7',
                'response_time' => 'Within 30 min',
                'years_experience' => '5+ years',
                'skills' => 'Electrical, Wiring',
                'minimum_fee' => 'PHP 500',
                'price_range' => 'PHP 500-3000',
                'travel_limit' => 'Up to 15 km',
                'rules_agreement' => true,
            ])
            ->assertOk()
            ->assertJsonPath('provider.display_name', 'Juan Electrical Works')
            ->assertJsonPath('provider.tagline', 'Electrical Specialist');

        $this->assertDatabaseHas('provider_profiles', [
            'user_id' => $provider->id,
            'about' => 'Reliable electrician with 5+ years of experience.',
            'response_time' => 'Within 30 min',
        ]);
    }

    public function test_client_can_view_public_provider_profile(): void
    {
        $client = User::factory()->create(['role' => 'client']);
        $provider = User::factory()->create(['role' => 'provider', 'name' => 'Nico Reyes']);
        ProviderProfile::create([
            'user_id' => $provider->id,
            'display_name' => 'Nico Electrical Works',
            'tagline' => 'Electrical Specialist',
            'category' => 'Electrical',
            'area' => 'Gingoog City',
            'availability' => 'Available',
            'about' => 'Trusted local electrician.',
            'rules_agreement' => true,
            'status' => 'Active',
        ]);

        $this->actingAs($client)
            ->getJson("/api/providers/{$provider->id}")
            ->assertOk()
            ->assertJsonPath('profile.display_name', 'Nico Electrical Works')
            ->assertJsonPath('user.name', 'Nico Reyes')
            ->assertJsonStructure(['stats', 'reviews', 'ratingBreakdown']);
    }

    public function test_provider_can_update_settings_preferences(): void
    {
        $provider = User::factory()->create(['role' => 'provider']);

        $this->actingAs($provider)
            ->postJson('/api/settings', [
                'theme' => 'dark',
                'push_notifications' => false,
            ])
            ->assertOk()
            ->assertJsonPath('preferences.theme', 'dark')
            ->assertJsonPath('preferences.push_notifications', false);

        $this->actingAs($provider)
            ->getJson('/api/state')
            ->assertOk()
            ->assertJsonPath('preferences.theme', 'dark')
            ->assertJsonPath('preferences.push_notifications', false);
    }
}
