<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class RealtimeBroadcaster
{
    public function emit(string $event, mixed $payload, array $rooms = ['kaila-mvp']): void
    {
        $url = rtrim((string) config('kaila.socket.url'), '/').'/internal/broadcast';
        $token = (string) config('kaila.socket.bearer_token');

        if (!$url || !$token) {
            return;
        }

        try {
            Http::timeout(2)
                ->withToken($token)
                ->post($url, [
                    'event' => $event,
                    'payload' => $payload,
                    'rooms' => $rooms,
                ]);
        } catch (\Throwable $exception) {
            Log::warning('KAILA realtime broadcast failed', ['event' => $event, 'error' => $exception->getMessage()]);
        }
    }

    public function toUser(int $userId, string $event, mixed $payload): void
    {
        $this->emit($event, $payload, ["user:{$userId}"]);
    }

    public function stateUpdated(mixed $payload = ['refresh' => true]): void
    {
        $this->emit('kaila.state.updated', $payload);
    }
}
