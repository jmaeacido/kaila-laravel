<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AssistantGuideTest extends TestCase
{
    use RefreshDatabase;

    public function test_katabang_logout_guidance_uses_top_right_profile_menu(): void
    {
        $client = $this->user('client', 'client-user');

        $response = $this->actingAs($client)->postJson('/api/assistant/chat', [
            'messages' => [
                ['role' => 'user', 'content' => 'How do I log out?'],
            ],
        ])->assertOk();

        $answer = strtolower((string) $response->json('answer'));
        $this->assertStringContainsString('top-right', $answer);
        $this->assertStringContainsString('logout', $answer);
        $this->assertDoesNotMatchRegularExpression('/(click|tap|open|use|go to).{0,40}bottom-left/', $answer);
    }

    public function test_ops_cannot_use_katabang(): void
    {
        $ops = $this->user('ops', 'ops-user');

        $this->actingAs($ops)->postJson('/api/assistant/chat', [
            'messages' => [
                ['role' => 'user', 'content' => 'How do I log out?'],
            ],
        ])->assertForbidden();
    }

    private function user(string $role, string $username): User
    {
        return User::factory()->create([
            'name' => 'Alex D.',
            'username' => $username,
            'email' => "{$username}@example.test",
            'password' => Hash::make('Password123!'),
            'role' => $role,
            'account_status' => 'active',
            'data_privacy_consent' => true,
        ]);
    }
}
