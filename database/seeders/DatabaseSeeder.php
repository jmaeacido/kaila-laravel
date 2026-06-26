<?php

namespace Database\Seeders;

use App\Models\FeedPost;
use App\Models\JobMessage;
use App\Models\Offer;
use App\Models\ProviderProfile;
use App\Models\ServiceRequest;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $client = User::factory()->create([
            'name' => 'Kaila Client',
            'username' => 'client',
            'email' => 'client@example.test',
            'password' => Hash::make('Password123!'),
            'role' => 'client',
            'area' => 'Barangay 20, Gingoog City',
            'category' => null,
        ]);

        $provider = User::factory()->create([
            'name' => 'Nico Reyes',
            'username' => 'provider',
            'email' => 'provider@example.test',
            'password' => Hash::make('Password123!'),
            'role' => 'provider',
            'area' => 'Santiago, Gingoog City',
            'category' => 'Electrical',
        ]);

        ProviderProfile::create([
            'user_id' => $provider->id,
            'display_name' => 'Nico Electrical Works',
            'provider_type' => 'Individual',
            'category' => 'Electrical',
            'specific_services' => 'Breakers, wiring checks, outlets, fixtures',
            'area' => 'Santiago, Gingoog City',
            'coverage_area' => 'Gingoog City, nearby barangays',
            'availability' => 'Available today',
            'emergency_availability' => 'Yes',
            'years_experience' => '6-10',
            'skills' => 'Residential troubleshooting, safe wiring repair',
            'minimum_fee' => 'PHP 350',
            'price_range' => 'PHP 350-1500 depending on materials',
            'rules_agreement' => true,
            'trust_level' => 'Verified demo',
            'status' => 'Active',
        ]);

        User::factory()->create([
            'name' => 'KAILA Support',
            'username' => 'support',
            'email' => 'support@example.test',
            'password' => Hash::make('Password123!'),
            'role' => 'customer_service',
            'area' => 'Admin / Ops',
            'account_status' => 'active',
        ]);

        User::factory()->create([
            'name' => 'KAILA Support Two',
            'username' => 'support2',
            'email' => 'support2@example.test',
            'password' => Hash::make('Password123!'),
            'role' => 'customer_service',
            'area' => 'Admin / Ops',
            'account_status' => 'active',
        ]);

        User::factory()->create([
            'name' => 'KAILA Admin',
            'username' => 'admin',
            'email' => 'admin@example.test',
            'password' => Hash::make('Password123!'),
            'role' => 'admin',
            'area' => 'Admin / Ops',
        ]);

        User::factory()->create([
            'name' => 'KAILA Super Admin',
            'username' => User::SUPER_ADMIN_USERNAME,
            'email' => 'jmaeacido@example.test',
            'password' => Hash::make('Password123!'),
            'role' => 'admin',
            'area' => 'Admin / Ops',
        ]);

        User::factory()->create([
            'name' => 'KAILA Ops',
            'username' => 'ops',
            'email' => 'ops@example.test',
            'password' => Hash::make('Password123!'),
            'role' => 'ops',
            'area' => 'Validation',
        ]);

        $request = ServiceRequest::create([
            'client_id' => $client->id,
            'accepted_provider_id' => $provider->id,
            'category' => 'Electrical',
            'urgency' => 'Today',
            'area' => 'Barangay 20, Gingoog City',
            'budget' => 'PHP 800-1200',
            'preferred_schedule' => 'Today after 3 PM',
            'contact_method' => 'Chat first',
            'exact_location_notes' => 'Blue gate near the corner sari-sari store.',
            'permission_to_forward' => true,
            'consent_to_rate' => true,
            'details' => 'Need help replacing a breaker and checking two outlets that stopped working.',
            'status' => 'Accepted',
            'confirmed_at' => now()->subMinutes(20),
        ]);

        Offer::create([
            'service_request_id' => $request->id,
            'provider_id' => $provider->id,
            'type' => 'offer',
            'amount' => 'PHP 950',
            'schedule' => 'Today 4 PM',
            'notes' => 'Can inspect first and confirm material cost.',
            'status' => 'accepted',
        ]);

        JobMessage::create([
            'service_request_id' => $request->id,
            'sender_id' => $client->id,
            'body' => 'Please message me when you are on the way.',
        ]);

        JobMessage::create([
            'service_request_id' => $request->id,
            'sender_id' => $provider->id,
            'body' => 'Got it. I will bring a tester and spare breaker options.',
        ]);

        ServiceRequest::create([
            'client_id' => $client->id,
            'category' => 'Cleaning Services',
            'urgency' => 'Tomorrow',
            'area' => 'Barangay 18-A, Gingoog City',
            'budget' => 'PHP 700',
            'preferred_schedule' => 'Morning',
            'contact_method' => 'KAILA chat',
            'details' => 'Need post-renovation cleaning for a small studio unit.',
            'status' => 'Posted',
            'permission_to_forward' => true,
            'consent_to_rate' => true,
        ]);

        FeedPost::create([
            'author_id' => $provider->id,
            'body' => 'Available for electrical checks around Gingoog City today until 7 PM.',
            'visibility' => 'public',
        ]);

        $disputed = ServiceRequest::create([
            'client_id' => $client->id,
            'accepted_provider_id' => $provider->id,
            'category' => 'Plumbing',
            'urgency' => 'Today',
            'area' => 'Barangay 22, Gingoog City',
            'budget' => 'PHP 600',
            'preferred_schedule' => 'Afternoon',
            'contact_method' => 'KAILA chat',
            'details' => 'Leaking pipe under the sink needs urgent repair.',
            'status' => 'Disputed',
            'dispute_note' => 'Client says work was incomplete; provider says additional parts were needed.',
            'permission_to_forward' => true,
            'consent_to_rate' => true,
            'confirmed_at' => now()->subDays(2),
        ]);

        \Illuminate\Support\Facades\DB::table('moderation_reports')->insert([
            'reporter_id' => $client->id,
            'reported_user_id' => $provider->id,
            'service_request_id' => $disputed->id,
            'type' => 'job',
            'reason' => 'Incomplete work',
            'details' => 'Support queue demo report tied to disputed plumbing job.',
            'status' => 'Open',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }
}
