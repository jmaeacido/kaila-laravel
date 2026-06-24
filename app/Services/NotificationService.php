<?php

namespace App\Services;

use App\Models\KailaNotification;
use App\Models\PushSubscription as StoredPushSubscription;
use App\Models\ServiceRequest;
use App\Models\User;
use Illuminate\Support\Facades\Log;
use Minishlink\WebPush\Subscription;
use Minishlink\WebPush\WebPush;

class NotificationService
{
    public function notify(User $user, string $type, string $title, string $body = '', array $data = [], ?User $actor = null, ?ServiceRequest $request = null): KailaNotification
    {
        $notification = KailaNotification::create([
            'user_id' => $user->id,
            'actor_id' => $actor?->id,
            'service_request_id' => $request?->id,
            'type' => $type,
            'title' => $title,
            'body' => $body,
            'data' => $data,
        ]);

        $this->sendPush($user, [
            'title' => $title,
            'body' => $body,
            'type' => $type,
            'url' => $data['url'] ?? route('app'),
            'requestId' => $request?->id,
            'notificationId' => $notification->id,
        ]);

        return $notification;
    }

    public function notifyMany(iterable $users, string $type, string $title, string $body = '', array $data = [], ?User $actor = null, ?ServiceRequest $request = null): void
    {
        foreach ($users as $user) {
            if ($user instanceof User) {
                $this->notify($user, $type, $title, $body, $data, $actor, $request);
            }
        }
    }

    private function sendPush(User $user, array $payload): void
    {
        $publicKey = config('kaila.web_push.public_key');
        $privateKey = config('kaila.web_push.private_key');

        if (!$publicKey || !$privateKey) {
            return;
        }

        $subscriptions = StoredPushSubscription::query()
            ->where('user_id', $user->id)
            ->get();

        if ($subscriptions->isEmpty()) {
            return;
        }

        $webPush = new WebPush([
            'VAPID' => [
                'subject' => config('kaila.web_push.subject'),
                'publicKey' => $publicKey,
                'privateKey' => $privateKey,
            ],
        ]);

        foreach ($subscriptions as $stored) {
            $subscription = Subscription::create([
                'endpoint' => $stored->endpoint,
                'keys' => [
                    'p256dh' => $stored->public_key,
                    'auth' => $stored->auth_token,
                ],
                'contentEncoding' => $stored->content_encoding ?: 'aes128gcm',
            ]);

            $webPush->queueNotification($subscription, json_encode($payload, JSON_THROW_ON_ERROR));
        }

        foreach ($webPush->flush() as $index => $report) {
            $stored = $subscriptions[$index] ?? null;
            if (!$stored) {
                continue;
            }

            if ($report->isSuccess()) {
                $stored->forceFill([
                    'last_success_at' => now(),
                    'last_error' => null,
                ])->save();
                continue;
            }

            $stored->forceFill([
                'last_failure_at' => now(),
                'last_error' => $report->getReason(),
            ])->save();

            Log::warning('KAILA Web Push failed', [
                'user_id' => $user->id,
                'endpoint' => $stored->endpoint_hash,
                'reason' => $report->getReason(),
            ]);
        }
    }
}
