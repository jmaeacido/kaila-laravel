<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Http;

class GroqService
{
    public function enabled(): bool
    {
        return (bool) config('kaila.groq.api_key');
    }

    public function chatJson(array $messages, array $fallback = []): array
    {
        if (!$this->enabled()) {
            return $fallback;
        }

        try {
            $response = Http::timeout(20)
                ->withToken((string) config('kaila.groq.api_key'))
                ->post('https://api.groq.com/openai/v1/chat/completions', [
                    'model' => config('kaila.groq.model'),
                    'temperature' => 0.4,
                    'response_format' => ['type' => 'json_object'],
                    'messages' => $messages,
                ]);

            if (!$response->successful()) {
                return $fallback;
            }

            $content = data_get($response->json(), 'choices.0.message.content');
            $decoded = json_decode((string) $content, true);

            return is_array($decoded) ? $decoded : $fallback;
        } catch (\Throwable) {
            return $fallback;
        }
    }

    public function assistantAnswer(array $context, array $messages): array
    {
        $user = $context['user'] ?? null;
        $contextPayload = $context;
        unset($contextPayload['user']);

        $prompt = [
            ['role' => 'system', 'content' => KailaAssistantGuide::systemInstructions()],
            ['role' => 'user', 'content' => 'KAILA context for this user: '.json_encode($contextPayload)],
        ];

        foreach ($messages as $message) {
            $prompt[] = [
                'role' => ($message['role'] ?? 'user') === 'assistant' ? 'assistant' : 'user',
                'content' => (string) ($message['content'] ?? ''),
            ];
        }

        $user = $context['user'] ?? null;
        $lastQuestion = (string) ($messages[count($messages) - 1]['content'] ?? '');
        if ($user instanceof User) {
            $faq = KailaAssistantGuide::matchFaq($lastQuestion, $user);
            if ($faq) {
                return $faq;
            }
        }

        $fallback = $user instanceof User
            ? KailaAssistantGuide::fallbackAnswer($user)
            : [
                'answer' => 'I can guide you around KAILA, but Groq is unavailable right now. Open Customer Service in the app for immediate help.',
                'suggestions' => ['How do I post a request?', 'How do I contact Customer Service?', 'How do I log out?'],
            ];

        return $this->chatJson($prompt, $fallback);
    }

    public function validationSignal(string $type, array $responses): array
    {
        $prompt = [[
            'role' => 'system',
            'content' => 'Score this KAILA pilot validation entry. Return JSON: decisionSignal (Positive|Neutral|Concern), reason (short string). Type: '.$type.'. Responses: '.json_encode($responses),
        ]];

        $fallbackScore = count(array_filter($responses));
        $fallback = [
            'decisionSignal' => $fallbackScore >= 5 ? 'Positive' : ($fallbackScore <= 1 ? 'Concern' : 'Neutral'),
            'reason' => 'Local scoring fallback while Groq is unavailable.',
        ];

        return $this->chatJson($prompt, $fallback);
    }

    public function analyticsInsights(array $metrics, array $samples): array
    {
        $prompt = [[
            'role' => 'system',
            'content' => 'You analyze KAILA marketplace pilot metrics. Return JSON: summary (string), risks (array), actions (array). Metrics: '
                .json_encode($metrics).' Samples: '.json_encode($samples),
        ]];

        return $this->chatJson($prompt, [
            'summary' => 'KAILA Laravel is collecting marketplace activity locally.',
            'risks' => ['Review provider response time and unresolved disputes before scaling.'],
            'actions' => ['Keep seeding provider coverage in active categories.'],
        ]);
    }
}
