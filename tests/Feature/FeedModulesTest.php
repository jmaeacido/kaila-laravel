<?php

namespace Tests\Feature;

use App\Models\FeedPost;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class FeedModulesTest extends TestCase
{
    use RefreshDatabase;

    public function test_feed_supports_reactions_comments_and_share_counts(): void
    {
        $author = $this->user('client', 'feed-author');
        $reader = $this->user('provider', 'feed-reader');

        $post = FeedPost::create([
            'author_id' => $author->id,
            'body' => 'Plumbing tip: fix leaking faucets early.',
            'visibility' => 'public',
        ]);

        $this->actingAs($reader)
            ->postJson("/api/feed/{$post->id}/reactions", ['reaction' => 'like'])
            ->assertOk()
            ->assertJsonPath('active', true);

        $this->actingAs($reader)
            ->postJson("/api/feed/{$post->id}/comments", ['body' => 'Great advice.'])
            ->assertCreated();

        $this->actingAs($reader)
            ->postJson("/api/feed/{$post->id}/share")
            ->assertOk()
            ->assertJsonPath('shareCount', 1);

        $response = $this->actingAs($reader)->getJson('/api/feed')->assertOk();
        $payload = collect($response->json('feed'))->firstWhere('id', $post->id);

        $this->assertSame(1, $payload['reactions']);
        $this->assertContains('like', $payload['viewerReactions']);
        $this->assertSame(1, $payload['comments']);
        $this->assertCount(1, $payload['commentList']);
        $this->assertSame(1, $payload['shareCount']);

        $this->actingAs($reader)
            ->postJson("/api/feed/{$post->id}/reactions", ['reaction' => 'like'])
            ->assertOk()
            ->assertJsonPath('active', false);
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
