<?php

namespace App\Http\Controllers;

use App\Models\FeedPost;
use App\Models\JobMessage;
use App\Models\KailaNotification;
use App\Models\Offer;
use App\Models\ProviderProfile;
use App\Models\PushSubscription;
use App\Models\ServiceRequest;
use App\Models\User;
use App\Services\MarketplaceWorkflow;
use App\Services\NotificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\StreamedResponse;

class MarketplaceController extends Controller
{
    public function __construct(
        private readonly NotificationService $notifications,
        private readonly MarketplaceWorkflow $workflow,
    ) {
    }

    public function app()
    {
        return view('app', [
            'categories' => config('kaila.categories'),
            'urgencies' => config('kaila.urgencies'),
            'vapidPublicKey' => config('kaila.web_push.public_key'),
        ]);
    }

    public function state(Request $request)
    {
        $user = $request->user();

        $requests = ServiceRequest::query()
            ->with(['client:id,name,username,area', 'acceptedProvider:id,name,username', 'offers.provider:id,name,username,area', 'messages.sender:id,name,username'])
            ->when(!$user->isStaff(), function ($query) use ($user) {
                $providerCategory = $user->providerProfile?->category;
                $query->where(function ($scope) use ($user, $providerCategory) {
                    $scope->where('client_id', $user->id)
                        ->orWhere('accepted_provider_id', $user->id)
                        ->orWhereHas('offers', fn ($offer) => $offer->where('provider_id', $user->id));

                    if ($providerCategory) {
                        $scope->orWhere(function ($available) use ($user, $providerCategory) {
                            $available->whereIn('status', ['Posted', 'Offers Received', 'Countered'])
                                ->where('client_id', '!=', $user->id)
                                ->where('category', $providerCategory)
                                ->whereDoesntHave('offers', fn ($offer) => $offer->where('provider_id', $user->id))
                                ->whereDoesntHave('passes', fn ($pass) => $pass->where('provider_id', $user->id));
                        });
                    }
                });
            })
            ->latest()
            ->limit(60)
            ->get();

        return response()->json([
            'user' => $user->load('providerProfile'),
            'categories' => config('kaila.categories'),
            'urgencies' => config('kaila.urgencies'),
            'requests' => $requests,
            'providers' => ProviderProfile::query()->with('user:id,name,username,area')->where('status', 'Active')->latest()->limit(30)->get(),
            'feed' => FeedPost::query()->with('author:id,name,username,role')->where('visibility', 'public')->latest()->limit(20)->get(),
            'notifications' => $user->notifications()->latest()->limit(30)->get(),
            'unreadNotifications' => $user->notifications()->whereNull('read_at')->count(),
            'pushStatus' => [
                'configured' => (bool) (config('kaila.web_push.public_key') && config('kaila.web_push.private_key')),
                'subscriptions' => PushSubscription::query()->where('user_id', $user->id)->count(),
            ],
        ]);
    }

    public function saveProvider(Request $request)
    {
        $user = $request->user();
        abort_unless($user->isMarketplaceUser(), 403);

        $data = $request->validate([
            'display_name' => ['nullable', 'string', 'max:160'],
            'provider_type' => ['nullable', 'string', 'max:80'],
            'category' => ['required', Rule::in(config('kaila.categories'))],
            'specific_services' => ['nullable', 'string', 'max:1000'],
            'area' => ['required', 'string', 'max:190'],
            'coverage_area' => ['nullable', 'string', 'max:1000'],
            'availability' => ['required', 'string', 'max:80'],
            'emergency_availability' => ['nullable', 'string', 'max:80'],
            'years_experience' => ['nullable', 'string', 'max:80'],
            'skills' => ['nullable', 'string', 'max:1000'],
            'minimum_fee' => ['nullable', 'string', 'max:80'],
            'price_range' => ['nullable', 'string', 'max:1000'],
            'rules_agreement' => ['accepted'],
        ]);

        $profile = ProviderProfile::updateOrCreate(
            ['user_id' => $user->id],
            [...$data, 'status' => 'Active']
        );

        $user->forceFill([
            'role' => 'provider',
            'category' => $data['category'],
            'area' => $data['area'],
        ])->save();

        return response()->json(['provider' => $profile->fresh('user')]);
    }

    public function createRequest(Request $request)
    {
        $user = $request->user();
        abort_unless($user->isMarketplaceUser(), 403);

        $data = $request->validate([
            'category' => ['required', Rule::in(config('kaila.categories'))],
            'urgency' => ['required', Rule::in(config('kaila.urgencies'))],
            'area' => ['required', 'string', 'max:190'],
            'budget' => ['nullable', 'string', 'max:80'],
            'preferred_schedule' => ['nullable', 'string', 'max:160'],
            'contact_method' => ['nullable', 'string', 'max:160'],
            'exact_location_notes' => ['nullable', 'string', 'max:1200'],
            'job_lat' => ['nullable', 'numeric', 'between:-90,90'],
            'job_lng' => ['nullable', 'numeric', 'between:-180,180'],
            'details' => ['required', 'string', 'min:10', 'max:2000'],
            'permission_to_forward' => ['boolean'],
            'consent_to_rate' => ['boolean'],
        ]);

        $serviceRequest = ServiceRequest::create([
            ...$data,
            'client_id' => $user->id,
            'status' => 'Posted',
            'job_location_source' => ($data['job_lat'] ?? null) ? 'browser' : null,
        ]);

        $providers = User::query()
            ->where('id', '!=', $user->id)
            ->where('role', 'provider')
            ->where('account_status', 'active')
            ->whereHas('providerProfile', fn ($query) => $query->where('category', $data['category'])->where('status', 'Active'))
            ->get();

        $this->notifications->notifyMany(
            $providers,
            'job.posted',
            'New urgent request',
            "{$data['category']} in {$data['area']}",
            ['url' => route('app'), 'requestId' => $serviceRequest->id],
            $user,
            $serviceRequest
        );

        return response()->json(['request' => $serviceRequest->load('client', 'offers.provider')], 201);
    }

    public function updateRequest(Request $request, ServiceRequest $serviceRequest)
    {
        abort_unless($serviceRequest->client_id === $request->user()->id, 403);
        abort_unless(in_array($serviceRequest->status, ['Posted', 'Offers Received', 'Countered'], true), 422);

        $data = $request->validate([
            'details' => ['required', 'string', 'min:10', 'max:2000'],
            'budget' => ['nullable', 'string', 'max:80'],
            'preferred_schedule' => ['nullable', 'string', 'max:160'],
        ]);

        $serviceRequest->update($data);

        return response()->json(['request' => $serviceRequest->fresh()]);
    }

    public function offer(Request $request, ServiceRequest $serviceRequest)
    {
        $user = $request->user();
        abort_unless($user->providerProfile && $serviceRequest->client_id !== $user->id, 403);
        abort_unless(in_array($serviceRequest->status, ['Posted', 'Offers Received', 'Countered'], true), 422);

        $data = $request->validate([
            'type' => ['nullable', Rule::in(['offer', 'counter'])],
            'amount' => ['required', 'string', 'max:80'],
            'schedule' => ['nullable', 'string', 'max:160'],
            'notes' => ['nullable', 'string', 'max:1200'],
            'provider_lat' => ['nullable', 'numeric', 'between:-90,90'],
            'provider_lng' => ['nullable', 'numeric', 'between:-180,180'],
        ]);

        $offer = $serviceRequest->offers()->create([
            ...$data,
            'provider_id' => $user->id,
            'type' => $data['type'] ?? 'offer',
            'provider_location_captured_at' => ($data['provider_lat'] ?? null) ? now() : null,
        ]);

        $serviceRequest->forceFill(['status' => $offer->type === 'counter' ? 'Countered' : 'Offers Received'])->save();

        $this->notifications->notify(
            $serviceRequest->client,
            'offer.received',
            'New provider offer',
            "{$user->name} offered {$offer->amount}",
            ['url' => route('app'), 'requestId' => $serviceRequest->id, 'offerId' => $offer->id],
            $user,
            $serviceRequest
        );

        return response()->json(['offer' => $offer->load('provider')], 201);
    }

    public function pass(Request $request, ServiceRequest $serviceRequest)
    {
        $user = $request->user();
        abort_unless($user->providerProfile, 403);

        DB::table('request_passes')->updateOrInsert([
            'service_request_id' => $serviceRequest->id,
            'provider_id' => $user->id,
        ], ['created_at' => now()]);

        return response()->json(['ok' => true]);
    }

    public function acceptOffer(Request $request, ServiceRequest $serviceRequest, Offer $offer)
    {
        abort_unless($serviceRequest->client_id === $request->user()->id, 403);
        abort_unless($offer->service_request_id === $serviceRequest->id, 404);
        abort_unless(in_array($serviceRequest->status, ['Offers Received', 'Countered', 'Posted'], true), 422);

        $this->workflow->acceptOffer($serviceRequest, $offer);

        $this->notifications->notify(
            $offer->provider,
            'offer.accepted',
            'Offer accepted',
            "{$serviceRequest->client->name} accepted your offer for {$serviceRequest->category}.",
            ['url' => route('app'), 'requestId' => $serviceRequest->id],
            $request->user(),
            $serviceRequest
        );

        return response()->json(['request' => $serviceRequest->fresh(['acceptedProvider', 'offers.provider'])]);
    }

    public function action(Request $request, ServiceRequest $serviceRequest)
    {
        $data = $request->validate([
            'action' => ['required', 'string'],
            'proof_note' => ['nullable', 'string', 'max:1200'],
            'revision_note' => ['nullable', 'string', 'max:1200'],
            'dispute_note' => ['nullable', 'string', 'max:1200'],
            'score' => ['nullable', 'integer', 'min:1', 'max:5'],
            'note' => ['nullable', 'string', 'max:1000'],
        ]);

        $before = $serviceRequest->status;
        $this->workflow->perform($serviceRequest, $request->user(), $data['action'], $data);
        $serviceRequest = $serviceRequest->fresh(['client', 'acceptedProvider']);

        $recipients = collect([$serviceRequest->client, $serviceRequest->acceptedProvider])
            ->filter(fn ($user) => $user && $user->id !== $request->user()->id);

        if ($before !== $serviceRequest->status) {
            $this->notifications->notifyMany(
                $recipients,
                'job.status',
                'Job status updated',
                "{$serviceRequest->category} is now {$serviceRequest->status}.",
                ['url' => route('app'), 'requestId' => $serviceRequest->id],
                $request->user(),
                $serviceRequest
            );
        }

        return response()->json(['request' => $serviceRequest]);
    }

    public function messages(Request $request, ServiceRequest $serviceRequest)
    {
        abort_unless($this->canReadConversation($serviceRequest, $request->user()), 403);

        return response()->json([
            'messages' => $serviceRequest->messages()->with('sender:id,name,username,role')->oldest()->get(),
        ]);
    }

    public function sendMessage(Request $request, ServiceRequest $serviceRequest)
    {
        $user = $request->user();
        abort_unless($this->canWriteConversation($serviceRequest, $user), 403);

        $data = $request->validate([
            'body' => ['required', 'string', 'max:2000'],
        ]);

        $message = JobMessage::create([
            'service_request_id' => $serviceRequest->id,
            'sender_id' => $user->id,
            'body' => $data['body'],
        ]);

        $recipients = collect([$serviceRequest->client, $serviceRequest->acceptedProvider])
            ->filter(fn ($recipient) => $recipient && $recipient->id !== $user->id);

        $this->notifications->notifyMany(
            $recipients,
            'message.received',
            'New job message',
            "{$user->name}: " . str($data['body'])->limit(80),
            ['url' => route('app'), 'requestId' => $serviceRequest->id, 'messageId' => $message->id],
            $user,
            $serviceRequest
        );

        return response()->json(['message' => $message->load('sender:id,name,username,role')], 201);
    }

    public function report(Request $request)
    {
        $data = $request->validate([
            'type' => ['required', Rule::in(['user', 'job'])],
            'reported_user_id' => ['nullable', 'exists:users,id'],
            'service_request_id' => ['nullable', 'exists:service_requests,id'],
            'reason' => ['required', 'string', 'max:160'],
            'details' => ['nullable', 'string', 'max:1200'],
        ]);

        $report = DB::table('moderation_reports')->insertGetId([
            'reporter_id' => $request->user()->id,
            'reported_user_id' => $data['reported_user_id'] ?? null,
            'service_request_id' => $data['service_request_id'] ?? null,
            'type' => $data['type'],
            'reason' => $data['reason'],
            'details' => $data['details'] ?? null,
            'status' => 'Open',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $staff = User::query()->whereIn('role', ['admin', 'customer_service'])->get();
        $this->notifications->notifyMany($staff, 'report.opened', 'New safety report', $data['reason'], ['reportId' => $report], $request->user());

        return response()->json(['ok' => true, 'report_id' => $report], 201);
    }

    public function feed(Request $request)
    {
        $data = $request->validate(['body' => ['required', 'string', 'max:1000']]);
        $post = FeedPost::create([
            'author_id' => $request->user()->id,
            'body' => $data['body'],
            'visibility' => 'public',
        ]);

        return response()->json(['post' => $post->load('author:id,name,username,role')], 201);
    }

    public function markNotifications(Request $request)
    {
        $ids = $request->input('ids');
        $query = $request->user()->notifications()->whereNull('read_at');

        if (is_array($ids) && count($ids)) {
            $query->whereIn('id', $ids);
        }

        $query->update(['read_at' => now()]);

        return response()->json(['ok' => true]);
    }

    public function pushSubscribe(Request $request)
    {
        $data = $request->validate([
            'endpoint' => ['required', 'string'],
            'keys.p256dh' => ['required', 'string'],
            'keys.auth' => ['required', 'string'],
            'contentEncoding' => ['nullable', 'string', 'max:40'],
            'deviceName' => ['nullable', 'string', 'max:120'],
        ]);

        $subscription = PushSubscription::updateOrCreate(
            ['endpoint_hash' => hash('sha256', $data['endpoint'])],
            [
                'user_id' => $request->user()->id,
                'endpoint' => $data['endpoint'],
                'public_key' => $data['keys']['p256dh'],
                'auth_token' => $data['keys']['auth'],
                'content_encoding' => $data['contentEncoding'] ?? 'aes128gcm',
                'device_name' => $data['deviceName'] ?? $request->userAgent(),
            ]
        );

        return response()->json(['ok' => true, 'subscription' => $subscription]);
    }

    public function stream(Request $request): StreamedResponse
    {
        $user = $request->user();

        return response()->stream(function () use ($request, $user) {
            $lastId = (int) $request->query('last_id', 0);
            $started = time();

            while (time() - $started < 25) {
                $items = KailaNotification::query()
                    ->where('user_id', $user->id)
                    ->where('id', '>', $lastId)
                    ->orderBy('id')
                    ->get();

                foreach ($items as $item) {
                    $lastId = $item->id;
                    echo "id: {$item->id}\n";
                    echo 'event: kaila.notification' . "\n";
                    echo 'data: ' . json_encode($item) . "\n\n";
                    @ob_flush();
                    flush();
                }

                echo ": heartbeat\n\n";
                @ob_flush();
                flush();
                sleep(3);
            }
        }, 200, [
            'Content-Type' => 'text/event-stream',
            'Cache-Control' => 'no-cache',
            'X-Accel-Buffering' => 'no',
        ]);
    }

    private function canReadConversation(ServiceRequest $request, User $user): bool
    {
        return $request->isParticipant($user) || $request->offers()->where('provider_id', $user->id)->exists();
    }

    private function canWriteConversation(ServiceRequest $request, User $user): bool
    {
        return $request->isParticipant($user)
            && in_array($request->status, ['Accepted', 'In Progress', 'Provider Marked Done', 'Revision Requested', 'Disputed'], true);
    }
}
