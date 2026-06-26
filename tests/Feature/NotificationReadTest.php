<?php

namespace Tests\Feature;

use App\Models\KailaNotification;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class NotificationReadTest extends TestCase
{
    use RefreshDatabase;

    public function test_mark_all_notifications_read_clears_unread_count(): void
    {
        $user = $this->user('client', 'notify-client');

        KailaNotification::create([
            'user_id' => $user->id,
            'type' => 'offer.received',
            'title' => 'New provider offer',
            'body' => 'Test offer',
            'data' => ['requestId' => 1],
        ]);

        $this->actingAs($user)
            ->getJson('/api/state')
            ->assertOk()
            ->assertJsonPath('unreadNotifications', 1);

        $this->actingAs($user)
            ->postJson('/api/notifications/read', [])
            ->assertOk()
            ->assertJsonPath('unreadNotifications', 0);

        $this->actingAs($user)
            ->getJson('/api/state')
            ->assertOk()
            ->assertJsonPath('unreadNotifications', 0);
    }

    public function test_mark_single_notification_read_updates_count(): void
    {
        $user = $this->user('client', 'notify-client-two');

        $first = KailaNotification::create([
            'user_id' => $user->id,
            'type' => 'job.status',
            'title' => 'Job status updated',
            'body' => 'Accepted',
        ]);

        KailaNotification::create([
            'user_id' => $user->id,
            'type' => 'message.received',
            'title' => 'New job message',
            'body' => 'Hello',
        ]);

        $this->actingAs($user)
            ->postJson('/api/notifications/read', ['ids' => [$first->id]])
            ->assertOk()
            ->assertJsonPath('unreadNotifications', 1);

        $this->assertNotNull($first->fresh()->read_at);
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
        ]);
    }
}
