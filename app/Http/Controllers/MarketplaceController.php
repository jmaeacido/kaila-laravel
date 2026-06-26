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
use App\Services\GroqService;
use App\Services\MarketplaceStateBuilder;
use App\Services\MarketplaceWorkflow;
use App\Services\MediaStorageService;
use App\Services\MessageEncryptionService;
use App\Services\NavigationService;
use App\Services\NotificationService;
use App\Services\RealtimeBroadcaster;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\StreamedResponse;

class MarketplaceController extends Controller
{
    public function __construct(
        private readonly NotificationService $notifications,
        private readonly MarketplaceWorkflow $workflow,
        private readonly NavigationService $navigation,
        private readonly MarketplaceStateBuilder $stateBuilder,
        private readonly MessageEncryptionService $encryption,
        private readonly MediaStorageService $media,
        private readonly GroqService $groq,
        private readonly RealtimeBroadcaster $realtime,
    ) {
    }

    public function app()
    {
        return view('app', [
            'categories' => config('kaila.categories'),
            'urgencies' => config('kaila.urgencies'),
            'address' => config('kaila.address'),
            'vapidPublicKey' => config('kaila.web_push.public_key'),
            'socketUrl' => config('kaila.socket.url'),
            'socketPath' => config('kaila.socket.client_path'),
        ]);
    }

    public function authConfig()
    {
        return response()->json([
            'googleClientId' => config('kaila.auth.google_client_id'),
            'facebookAppId' => config('kaila.auth.facebook_app_id'),
            'socialLoginEnabled' => (bool) (config('kaila.auth.google_client_id') || config('kaila.auth.facebook_app_id')),
        ]);
    }

    public function rtcConfig()
    {
        return response()->json([
            'iceServers' => config('kaila.rtc.ice_servers'),
        ]);
    }

    public function mobileUpdate()
    {
        $versionCode = (int) config('kaila.mobile.latest_version_code');
        $apkUrl = (string) config('kaila.mobile.apk_url');

        return response()->json([
            'enabled' => $versionCode > 0 && $apkUrl !== '',
            'latestVersionCode' => $versionCode,
            'latestVersionName' => config('kaila.mobile.latest_version_name'),
            'apkUrl' => '',
            'downloadUrl' => $versionCode > 0 && $apkUrl !== '' ? url('/api/mobile-update/apk') : '',
            'releaseNotes' => config('kaila.mobile.release_notes'),
            'source' => 'laravel-env',
        ]);
    }

    public function mobileUpdateApk()
    {
        abort_unless(config('kaila.mobile.apk_url'), 404);

        return redirect()->away(config('kaila.mobile.apk_url'));
    }

    public function state(Request $request)
    {
        $user = $request->user();
        $this->workflow->autoConfirmDue($this->notifications);

        $requests = ServiceRequest::query()
            ->with(['client:id,name,username,area', 'acceptedProvider:id,name,username', 'offers.provider:id,name,username,area', 'messages.sender:id,name,username'])
            ->when($user->isCustomerService(), fn ($query) => $query->whereIn('id', $this->stateBuilder->supportVisibleRequestIds() ?: [0]))
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

        $navigationStates = $this->stateBuilder->navigationStatesFor($requests->pluck('id')->all());
        $requestsPayload = $requests->map(function (ServiceRequest $item) use ($navigationStates) {
            $payload = $item->toArray();
            $payload['navigation_state'] = $navigationStates[$item->id] ?? null;

            return $payload;
        });

        $metrics = match (true) {
            $user->role === 'provider' => ['provider' => $this->stateBuilder->providerMetrics($user)],
            $user->role === 'client' => ['client' => $this->stateBuilder->clientMetrics($user)],
            $user->isCustomerService() => ['support' => $this->stateBuilder->supportMetrics($user)],
            $user->isStaff() => ['staff' => $this->stateBuilder->staffMetrics($user)],
            default => [],
        };

        $supportPayload = ($user->isCustomerService() || $user->isAdmin()) ? [
            'queue' => $this->stateBuilder->supportQueue(),
            'threads' => $user->isCustomerService() ? $this->stateBuilder->directConversationThreads($user) : [],
            'activities' => $user->isCustomerService() ? $this->stateBuilder->supportActivities($user) : [],
            'permissions' => [
                'canTriageReports' => $user->canTriageReports(),
                'canResolveDisputes' => $user->canResolveDisputes(),
                'canWriteSupportNotes' => $user->canWriteSupportNotes(),
            ],
        ] : null;

        return response()->json([
            'user' => $user->load('providerProfile'),
            'categories' => config('kaila.categories'),
            'urgencies' => config('kaila.urgencies'),
            'requests' => $requestsPayload,
            'providers' => ProviderProfile::query()->with('user:id,name,username,area')->where('status', 'Active')->latest()->limit(30)->get(),
            'feed' => FeedPost::query()->with('author:id,name,username,role')->where('visibility', 'public')->latest()->limit(20)->get(),
            'notifications' => $user->notifications()->latest()->limit(30)->get(),
            'unreadNotifications' => $user->notifications()->whereNull('read_at')->count(),
            'supportDesk' => $this->stateBuilder->supportDesk(),
            'support' => $supportPayload,
            'admin' => $user->isStaff() ? [
                'users' => $this->stateBuilder->staffUsers($user),
                'reports' => $this->stateBuilder->moderationReports($user),
                'validationEntries' => $this->stateBuilder->validationEntries($user),
                'auditLogs' => $this->stateBuilder->auditLogs($user),
                'permissions' => [
                    'isAdmin' => $user->isAdmin(),
                    'isSuperAdmin' => $user->isSuperAdmin(),
                    'isCustomerService' => $user->isCustomerService(),
                    'isOps' => $user->isOps(),
                ],
            ] : null,
            'metrics' => $metrics,
            'pushStatus' => [
                'configured' => (bool) (config('kaila.web_push.public_key') && config('kaila.web_push.private_key')),
                'subscriptions' => PushSubscription::query()->where('user_id', $user->id)->count(),
            ],
        ]);
    }

    public function profile(Request $request)
    {
        $data = $request->validate([
            'name' => ['nullable', 'string', 'max:160'],
            'area' => ['nullable', 'string', 'max:190'],
            'category' => ['nullable', 'string', 'max:160'],
            'contact_number' => ['nullable', 'string', 'max:80'],
            'preferred_contact_channel' => ['nullable', 'string', 'max:80'],
            'best_contact_time' => ['nullable', 'string', 'max:120'],
            'activeRole' => ['nullable', Rule::in(['client', 'provider'])],
        ]);

        $request->user()->update(collect($data)->except('activeRole')->all());

        return response()->json(['user' => $request->user()->fresh('providerProfile')]);
    }

    public function deleteAccount(Request $request)
    {
        $request->validate([
            'confirm' => ['required', 'in:DELETE'],
        ]);

        $user = $request->user();
        DB::table('push_tokens')->where('user_id', $user->id)->delete();
        PushSubscription::query()->where('user_id', $user->id)->delete();
        $user->forceFill([
            'account_status' => 'deleted',
            'email' => null,
            'contact_number' => null,
            'deleted_at' => now(),
        ])->save();

        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json(['ok' => true]);
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
            'attachments' => ['nullable', 'array', 'max:6'],
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

        $attachments = [];
        if (!empty($data['attachments'])) {
            $attachments = $this->media->attachToRequest($serviceRequest->id, 'request', $data['attachments']);
        }

        $this->realtime->emit('kaila.request.created', ['requestId' => $serviceRequest->id]);
        $this->realtime->stateUpdated();

        return response()->json([
            'request' => $serviceRequest->load('client', 'offers.provider'),
            'attachments' => $attachments,
        ], 201);
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

        $this->realtime->toUser($serviceRequest->client_id, 'kaila.request.action', [
            'requestId' => $serviceRequest->id,
            'action' => 'offer',
        ]);
        $this->realtime->stateUpdated();

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

        $this->realtime->stateUpdated();

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

        $this->realtime->emit('kaila.request.action', [
            'requestId' => $serviceRequest->id,
            'action' => 'accept',
        ], ["user:{$serviceRequest->client_id}", "user:{$offer->provider_id}"]);
        $this->realtime->stateUpdated();

        return response()->json(['request' => $serviceRequest->fresh(['acceptedProvider', 'offers.provider'])]);
    }

    public function confirmRequest(Request $request, ServiceRequest $serviceRequest)
    {
        $data = $request->validate([
            'offerId' => ['required_without:offer_id', 'integer'],
            'offer_id' => ['required_without:offerId', 'integer'],
        ]);

        $offer = Offer::query()->findOrFail($data['offer_id'] ?? $data['offerId']);

        return $this->acceptOffer($request, $serviceRequest, $offer);
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
            'attachments' => ['nullable', 'array', 'max:6'],
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
            $this->realtime->emit('kaila.request.action', [
                'requestId' => $serviceRequest->id,
                'action' => $data['action'],
                'status' => $serviceRequest->status,
            ]);
            $this->realtime->stateUpdated();
        }

        if (in_array($data['action'], ['provider_complete', 'dispute'], true) && !empty($data['attachments'])) {
            $this->media->attachToRequest(
                $serviceRequest->id,
                $data['action'] === 'dispute' ? 'dispute' : 'completion',
                $data['attachments']
            );
        }

        return response()->json(['request' => $serviceRequest]);
    }

    public function messages(Request $request, ServiceRequest $serviceRequest)
    {
        abort_unless($this->canReadConversation($serviceRequest, $request->user()), 403);

        return response()->json([
            'messages' => $serviceRequest->messages()->with('sender:id,name,username,role')->oldest()->get()->map(function (JobMessage $message) {
                $mapped = $this->mapJobMessage($message);
                $mapped['attachments'] = DB::table('job_message_attachments')
                    ->where('job_message_id', $message->id)
                    ->get()
                    ->map(fn ($row) => [
                        'id' => $row->id,
                        'url' => route('message-media.show', $row->id),
                        'mimeType' => $row->mime_type,
                        'originalName' => $row->original_name,
                    ])->values()->all();

                return $mapped;
            }),
        ]);
    }

    public function sendMessage(Request $request, ServiceRequest $serviceRequest)
    {
        $user = $request->user();
        abort_unless($this->canWriteConversation($serviceRequest, $user), 403);

        $data = $request->validate([
            'body' => ['required_without:attachments', 'nullable', 'string', 'max:2000'],
            'attachments' => ['nullable', 'array', 'max:6'],
        ]);

        $message = JobMessage::create([
            'service_request_id' => $serviceRequest->id,
            'sender_id' => $user->id,
            'body' => '',
            'kind' => 'text',
        ]);
        $message->forceFill([
            'body' => $this->encryption->encrypt(trim((string) ($data['body'] ?? '')) ?: '[media]', $message->id),
        ])->save();

        $attachments = !empty($data['attachments'])
            ? $this->media->attachToJobMessage($message->id, $data['attachments'])
            : [];

        $mapped = $this->mapJobMessage($message->load('sender:id,name,username,role'));
        $mapped['attachments'] = $attachments;

        $recipients = collect([$serviceRequest->client, $serviceRequest->acceptedProvider])
            ->filter(fn ($recipient) => $recipient && $recipient->id !== $user->id);

        $this->notifications->notifyMany(
            $recipients,
            'message.received',
            'New job message',
            "{$user->name}: " . str($this->encryption->decrypt($message->body, $message->id))->limit(80),
            ['url' => route('app'), 'requestId' => $serviceRequest->id, 'messageId' => $message->id],
            $user,
            $serviceRequest
        );

        $this->realtime->emit('kaila.message.saved', [
            'requestId' => $serviceRequest->id,
            'message' => $mapped,
        ], ["user:{$serviceRequest->client_id}", "user:{$serviceRequest->accepted_provider_id}"]);

        return response()->json(['message' => $mapped], 201);
    }

    public function typing(Request $request, ServiceRequest $serviceRequest)
    {
        abort_unless($this->canReadConversation($serviceRequest, $request->user()), 403);

        return response()->json(['ok' => true]);
    }

    public function presence(Request $request, ServiceRequest $serviceRequest)
    {
        abort_unless($this->canReadConversation($serviceRequest, $request->user()), 403);

        return response()->json(['ok' => true]);
    }

    public function messageReaction(Request $request, ServiceRequest $serviceRequest, JobMessage $message)
    {
        abort_unless($message->service_request_id === $serviceRequest->id, 404);
        abort_unless($this->canReadConversation($serviceRequest, $request->user()), 403);

        $data = $request->validate([
            'reaction' => ['required', 'string', 'max:40'],
        ]);

        DB::table('job_message_reactions')->updateOrInsert([
            'job_message_id' => $message->id,
            'user_id' => $request->user()->id,
            'reaction' => $data['reaction'],
        ], ['created_at' => now()]);

        return response()->json(['ok' => true]);
    }

    public function directMessages(Request $request, User $user)
    {
        $viewer = $request->user();
        abort_unless($viewer->canInitiateDirectContact($user) || $viewer->id === $user->id, 403);
        abort_if($this->isBlockedBetween($viewer->id, $user->id), 403, 'Messages are blocked between these accounts.');

        $messages = DB::table('direct_messages')
            ->where(function ($query) use ($viewer, $user) {
                $query->where('sender_id', $viewer->id)->where('recipient_id', $user->id);
            })
            ->orWhere(function ($query) use ($viewer, $user) {
                $query->where('sender_id', $user->id)->where('recipient_id', $viewer->id);
            })
            ->orderBy('created_at')
            ->limit(200)
            ->get();

        return response()->json(['messages' => $messages->map(function ($row) {
            $mapped = $this->mapDirectMessage($row);
            $mapped['attachments'] = DB::table('direct_message_attachments')
                ->where('direct_message_id', $row->id)
                ->get()
                ->map(fn ($attachment) => [
                    'id' => $attachment->id,
                    'url' => route('direct-media.show', $attachment->id),
                    'mimeType' => $attachment->mime_type,
                    'originalName' => $attachment->original_name,
                ])->values()->all();

            return $mapped;
        })]);
    }

    public function sendDirectMessage(Request $request, User $user)
    {
        $viewer = $request->user();
        abort_unless($viewer->canInitiateDirectContact($user), 403);
        abort_if($this->isBlockedBetween($viewer->id, $user->id), 403, 'Messages are blocked between these accounts.');

        $data = $request->validate([
            'body' => ['required_without:attachments', 'nullable', 'string', 'max:2000'],
            'attachments' => ['nullable', 'array', 'max:6'],
        ]);
        $id = DB::table('direct_messages')->insertGetId([
            'sender_id' => $viewer->id,
            'recipient_id' => $user->id,
            'body' => '',
            'kind' => 'text',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        DB::table('direct_messages')->where('id', $id)->update([
            'body' => $this->encryption->encrypt(trim((string) ($data['body'] ?? '')) ?: '[media]', $id),
        ]);
        $row = DB::table('direct_messages')->find($id);
        $mapped = $this->mapDirectMessage($row);
        $mapped['attachments'] = !empty($data['attachments'])
            ? $this->media->attachToDirectMessage($id, $data['attachments'])
            : [];

        $this->notifications->notify(
            $user,
            'direct.message',
            'New direct message',
            "{$viewer->name}: " . str($data['body'])->limit(80),
            ['directUserId' => $viewer->id],
            $viewer
        );

        $this->realtime->toUser($user->id, 'kaila.direct-message.saved', ['message' => $mapped]);

        return response()->json(['message' => $mapped], 201);
    }

    public function directPresence(Request $request, User $user)
    {
        abort_unless($request->user()->canInitiateDirectContact($user), 403);

        return response()->json(['ok' => true]);
    }

    public function messageSummary(Request $request)
    {
        $user = $request->user();
        $threads = ServiceRequest::query()
            ->with('messages:id,service_request_id,sender_id,body,created_at')
            ->where(function ($query) use ($user) {
                $query->where('client_id', $user->id)->orWhere('accepted_provider_id', $user->id);
            })
            ->whereHas('messages')
            ->get()
            ->map(fn (ServiceRequest $item) => [
                'threadId' => (string) $item->id,
                'scope' => 'job',
                'latestMessage' => $item->messages->sortByDesc('created_at')->first(),
            ])
            ->values();

        return response()->json(['threads' => $threads]);
    }

    public function messageRead(Request $request)
    {
        $data = $request->validate([
            'scope' => ['nullable', 'string', 'max:20'],
            'threadId' => ['nullable', 'string', 'max:160'],
            'readAt' => ['nullable', 'date'],
        ]);

        DB::table('message_read_states')->updateOrInsert([
            'user_id' => $request->user()->id,
            'scope' => $data['scope'] ?? 'all',
            'thread_id' => $data['threadId'] ?? '*',
        ], ['read_at' => isset($data['readAt']) ? Carbon::parse($data['readAt']) : now()]);

        return response()->json(['ok' => true]);
    }

    public function notificationSummary(Request $request)
    {
        return response()->json([
            'activities' => DB::table('activities')->latest()->limit(20)->get(),
            'missedCalls' => DB::table('missed_calls')->where('recipient_id', $request->user()->id)->latest()->limit(20)->get(),
            'feedNotifications' => $request->user()->notifications()->where('type', 'like', 'feed.%')->latest()->limit(20)->get(),
        ]);
    }

    public function notificationRead(Request $request)
    {
        $types = $request->input('types', $request->input('type', ['activity', 'missedCall', 'feed']));
        $types = is_array($types) ? $types : [$types];

        foreach ($types as $type) {
            DB::table('notification_read_states')->updateOrInsert([
                'user_id' => $request->user()->id,
                'type' => (string) $type,
            ], ['read_at' => now()]);
        }

        return response()->json(['ok' => true]);
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

    public function reportUser(Request $request)
    {
        $data = $request->validate([
            'reported_user_id' => ['required', 'exists:users,id'],
            'reason' => ['required', 'string', 'max:160'],
            'details' => ['nullable', 'string', 'max:1200'],
        ]);

        $request->merge(['type' => 'user', ...$data]);

        return $this->report($request);
    }

    public function reportJob(Request $request)
    {
        $data = $request->validate([
            'service_request_id' => ['required', 'exists:service_requests,id'],
            'reason' => ['required', 'string', 'max:160'],
            'details' => ['nullable', 'string', 'max:1200'],
        ]);

        $request->merge(['type' => 'job', ...$data]);

        return $this->report($request);
    }

    public function reportAction(Request $request, int $report)
    {
        $this->authorizeSupport($request->user());
        $data = $request->validate([
            'status' => ['required', Rule::in(['Open', 'In Review', 'Closed'])],
            'resolution_note' => ['nullable', 'string', 'max:1200'],
        ]);

        DB::table('moderation_reports')->where('id', $report)->update([
            'status' => $data['status'],
            'updated_at' => now(),
        ]);
        $this->recordAuditLog($request->user(), 'report.'.$data['status'], [
            'report_id' => $report,
            'resolution_note' => $data['resolution_note'] ?? null,
        ]);

        return response()->json(['ok' => true, 'report' => DB::table('moderation_reports')->find($report)]);
    }

    public function blockUser(Request $request, User $user)
    {
        abort_unless($request->user()->id !== $user->id, 422);

        DB::table('user_blocks')->updateOrInsert([
            'blocker_id' => $request->user()->id,
            'blocked_id' => $user->id,
        ], [
            'reason' => $request->string('reason')->limit(1000),
            'created_at' => now(),
        ]);

        return response()->json(['ok' => true]);
    }

    public function unblockUser(Request $request, User $user)
    {
        DB::table('user_blocks')
            ->where('blocker_id', $request->user()->id)
            ->where('blocked_id', $user->id)
            ->delete();

        return response()->json(['ok' => true]);
    }

    public function feedIndex()
    {
        $posts = FeedPost::query()->with('author:id,name,username,role')->where('visibility', 'public')->latest()->limit(50)->get();
        $mediaByPost = DB::table('feed_post_media')->whereIn('feed_post_id', $posts->pluck('id'))->get()->groupBy('feed_post_id');
        $reactions = DB::table('feed_post_reactions')->whereIn('feed_post_id', $posts->pluck('id'))->get()->groupBy('feed_post_id');
        $comments = DB::table('feed_post_comments')->whereIn('feed_post_id', $posts->pluck('id'))->get()->groupBy('feed_post_id');

        return response()->json([
            'feed' => $posts->map(fn (FeedPost $post) => $this->mapFeedPost(
                $post,
                ($mediaByPost[$post->id] ?? collect())->map(fn ($row) => [
                    'id' => $row->id,
                    'url' => route('feed-media.show', $row->id),
                    'mimeType' => $row->mime_type,
                    'originalName' => $row->original_name,
                ])->values()->all(),
                $reactions[$post->id] ?? collect(),
                $comments[$post->id] ?? collect(),
            )),
        ]);
    }

    public function feed(Request $request)
    {
        $data = $request->validate([
            'body' => ['required', 'string', 'max:1000'],
            'attachments' => ['nullable', 'array', 'max:4'],
        ]);
        $post = FeedPost::create([
            'author_id' => $request->user()->id,
            'body' => $data['body'],
            'visibility' => 'public',
        ]);

        $media = !empty($data['attachments'])
            ? $this->media->attachToFeedPost($post->id, $data['attachments'])
            : [];

        $payload = $this->mapFeedPost($post->load('author:id,name,username,role'), $media);
        $this->realtime->emit('kaila.feed.updated', ['post' => $payload]);

        return response()->json(['post' => $payload], 201);
    }

    public function feedUpdate(Request $request, FeedPost $feedPost)
    {
        abort_unless($feedPost->author_id === $request->user()->id || $request->user()->isStaff(), 403);
        $data = $request->validate(['body' => ['required', 'string', 'max:1000']]);
        $feedPost->update($data);

        return response()->json(['post' => $feedPost->fresh('author:id,name,username,role')]);
    }

    public function feedDelete(Request $request, FeedPost $feedPost)
    {
        abort_unless($feedPost->author_id === $request->user()->id || $request->user()->isStaff(), 403);
        $feedPost->delete();

        return response()->json(['ok' => true]);
    }

    public function publicPost(FeedPost $feedPost)
    {
        abort_unless($feedPost->visibility === 'public', 404);

        return response()->json(['post' => $feedPost->load('author:id,name,username,role')]);
    }

    public function feedShare(FeedPost $feedPost)
    {
        $feedPost->increment('share_count');

        return response()->json(['ok' => true, 'shareCount' => $feedPost->fresh()->share_count]);
    }

    public function feedReaction(Request $request, FeedPost $feedPost)
    {
        $data = $request->validate([
            'reaction' => ['required', Rule::in(['like', 'helpful', 'interested'])],
        ]);

        DB::table('feed_post_reactions')->updateOrInsert([
            'feed_post_id' => $feedPost->id,
            'user_id' => $request->user()->id,
            'reaction' => $data['reaction'],
        ], ['created_at' => now()]);

        return response()->json(['ok' => true]);
    }

    public function feedComment(Request $request, FeedPost $feedPost)
    {
        $data = $request->validate([
            'body' => ['required', 'string', 'max:1000'],
            'parent_comment_id' => ['nullable', 'exists:feed_post_comments,id'],
        ]);

        $id = DB::table('feed_post_comments')->insertGetId([
            'feed_post_id' => $feedPost->id,
            'user_id' => $request->user()->id,
            'parent_comment_id' => $data['parent_comment_id'] ?? null,
            'body' => $data['body'],
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json(['comment' => DB::table('feed_post_comments')->find($id)], 201);
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

    public function pushToken(Request $request)
    {
        $data = $request->validate([
            'token' => ['required', 'string'],
            'platform' => ['nullable', 'string', 'max:40'],
            'deviceId' => ['nullable', 'string', 'max:120'],
            'device_id' => ['nullable', 'string', 'max:120'],
        ]);

        $tokenHash = hash('sha256', $data['token']);
        $deviceId = $data['device_id'] ?? $data['deviceId'] ?? null;
        DB::table('push_tokens')->updateOrInsert([
            'token_hash' => $tokenHash,
        ], [
            'user_id' => $request->user()->id,
            'token' => $data['token'],
            'platform' => $data['platform'] ?? 'android',
            'device_id' => $deviceId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        if ($deviceId) {
            DB::table('push_tokens')
                ->where('user_id', $request->user()->id)
                ->where('device_id', $deviceId)
                ->where('token_hash', '!=', $tokenHash)
                ->delete();
        }

        return response()->json(['ok' => true, 'tokenCount' => DB::table('push_tokens')->where('user_id', $request->user()->id)->count()]);
    }

    public function pushStatus(Request $request)
    {
        return response()->json([
            'configured' => (bool) (config('kaila.web_push.public_key') && config('kaila.web_push.private_key')),
            'subscriptions' => PushSubscription::query()->where('user_id', $request->user()->id)->count(),
            'tokens' => DB::table('push_tokens')->where('user_id', $request->user()->id)->count(),
            'devices' => DB::table('push_tokens')->where('user_id', $request->user()->id)->select('platform', 'device_id', 'updated_at')->latest('updated_at')->get(),
        ]);
    }

    public function routeDistance(Request $request)
    {
        $data = $request->validate([
            'fromLat' => ['required', 'numeric', 'between:-90,90'],
            'fromLng' => ['required', 'numeric', 'between:-180,180'],
            'toLat' => ['required', 'numeric', 'between:-90,90'],
            'toLng' => ['required', 'numeric', 'between:-180,180'],
        ]);

        $fallback = $this->haversineMeters((float) $data['fromLat'], (float) $data['fromLng'], (float) $data['toLat'], (float) $data['toLng']);
        $base = config('kaila.route_distance_url');

        if ($base) {
            try {
                $url = rtrim($base, '/') . "/{$data['fromLng']},{$data['fromLat']};{$data['toLng']},{$data['toLat']}";
                $payload = Http::timeout(8)->get($url, ['overview' => 'false', 'alternatives' => 'false', 'steps' => 'false'])->json();
                $route = $payload['routes'][0] ?? null;
                if ($route) {
                    $distanceMeters = (int) round($route['distance'] ?? $fallback);
                    return response()->json([
                        'distanceMeters' => $distanceMeters,
                        'distanceKm' => round($distanceMeters / 1000, 1),
                        'durationSeconds' => (int) round($route['duration'] ?? ($fallback / 6)),
                        'source' => 'osrm',
                    ]);
                }
            } catch (\Throwable) {
                // Fall back to straight-line estimate when the public router is unavailable.
            }
        }

        $distanceMeters = (int) round($fallback);
        return response()->json([
            'distanceMeters' => $distanceMeters,
            'distanceKm' => round($distanceMeters / 1000, 1),
            'durationSeconds' => (int) round($fallback / 6),
            'source' => 'haversine',
        ]);
    }

    public function navigation(Request $request, ServiceRequest $serviceRequest)
    {
        abort_unless($serviceRequest->isParticipant($request->user()), 403);

        return response()->json([
            'requestId' => $serviceRequest->id,
            'navigationState' => $this->navigation->stateFor($serviceRequest),
        ]);
    }

    public function navigationStart(Request $request, ServiceRequest $serviceRequest)
    {
        $state = $this->navigation->start($serviceRequest, $request->user());

        $this->realtime->emit('kaila.request.action', [
            'requestId' => $serviceRequest->id,
            'action' => 'navigation',
            'navigationState' => $state,
        ], ["user:{$serviceRequest->client_id}", "user:{$serviceRequest->accepted_provider_id}"]);

        return response()->json([
            'requestId' => $serviceRequest->id,
            'navigationState' => $state,
        ]);
    }

    public function navigationUpdate(Request $request, ServiceRequest $serviceRequest)
    {
        $data = $request->validate([
            'lat' => ['required', 'numeric', 'between:-90,90'],
            'lng' => ['required', 'numeric', 'between:-180,180'],
        ]);

        $state = $this->navigation->updateLocation(
            $serviceRequest,
            $request->user(),
            (float) $data['lat'],
            (float) $data['lng'],
        );

        $this->realtime->emit('kaila.request.action', [
            'requestId' => $serviceRequest->id,
            'action' => 'navigation',
            'navigationState' => $state,
        ], ["user:{$serviceRequest->client_id}", "user:{$serviceRequest->accepted_provider_id}"]);

        return response()->json([
            'requestId' => $serviceRequest->id,
            'navigationState' => $state,
        ]);
    }

    public function navigationStop(Request $request, ServiceRequest $serviceRequest)
    {
        $state = $this->navigation->stop($serviceRequest, $request->user());

        $this->realtime->emit('kaila.request.action', [
            'requestId' => $serviceRequest->id,
            'action' => 'navigation-stop',
            'navigationState' => $state,
        ], ["user:{$serviceRequest->client_id}", "user:{$serviceRequest->accepted_provider_id}"]);

        return response()->json([
            'requestId' => $serviceRequest->id,
            'navigationState' => $state,
        ]);
    }

    public function activity(Request $request)
    {
        abort_unless($request->user()->canWriteSupportNotes(), 403);

        $data = $request->validate(['detail' => ['required', 'string', 'max:1200']]);
        $id = DB::table('activities')->insertGetId([
            'title' => 'KAILA activity',
            'detail' => $data['detail'],
            'user_id' => $request->user()->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json(['activity' => DB::table('activities')->find($id)], 201);
    }

    public function validationDecisionSignal(Request $request)
    {
        $this->authorizeValidation($request->user());
        $data = $request->validate([
            'type' => ['required', Rule::in(['client_survey', 'provider_interview'])],
            'responses' => ['required', 'array'],
        ]);

        $result = $this->groq->validationSignal($data['type'], $data['responses']);

        return response()->json([
            'decisionSignal' => $result['decisionSignal'] ?? 'Neutral',
            'reason' => $result['reason'] ?? 'Scored locally.',
        ]);
    }

    public function analyticsInsights(Request $request)
    {
        abort_unless($request->user()->isAdmin(), 403);

        $metrics = [
            'requests' => ServiceRequest::query()->count(),
            'activeProviders' => ProviderProfile::query()->where('status', 'Active')->count(),
            'disputes' => ServiceRequest::query()->where('status', 'Disputed')->count(),
            'responseRate' => Offer::query()->count(),
        ];
        $samples = ServiceRequest::query()->latest()->limit(5)->get(['category', 'status', 'area'])->toArray();
        $insight = $this->groq->analyticsInsights($metrics, $samples);

        return response()->json([
            'summary' => $insight['summary'] ?? '',
            'risks' => array_values($insight['risks'] ?? []),
            'actions' => array_values($insight['actions'] ?? []),
        ]);
    }

    public function assistantChat(Request $request)
    {
        abort_if($request->user()->role === 'ops', 403, 'Ops accounts are limited to validation work.');

        $messages = collect($request->input('messages', []))
            ->slice(-12)
            ->map(fn ($message) => [
                'role' => ($message['role'] ?? 'user') === 'assistant' ? 'assistant' : 'user',
                'content' => Str::limit((string) ($message['content'] ?? ''), 2000),
            ])
            ->filter(fn ($message) => $message['content'])
            ->values()
            ->all();

        abort_unless(($messages[count($messages) - 1]['role'] ?? '') === 'user', 422, 'Ask Katabang a question first.');

        $context = [
            'role' => $request->user()->role,
            'area' => $request->user()->area,
            'openRequests' => ServiceRequest::query()->where('client_id', $request->user()->id)->count(),
        ];
        $response = $this->groq->assistantAnswer($context, $messages);

        return response()->json([
            'answer' => Str::limit((string) ($response['answer'] ?? ''), 2400),
            'suggestions' => array_slice(array_values($response['suggestions'] ?? []), 0, 4),
        ]);
    }

    public function validationStore(Request $request)
    {
        $this->authorizeValidation($request->user());
        $data = $request->validate([
            'type' => ['required', Rule::in(['client_survey', 'provider_interview'])],
            'responses' => ['required', 'array'],
            'decision_signal' => ['nullable', 'string', 'max:40'],
            'decision_reason' => ['nullable', 'string', 'max:1200'],
        ]);

        $id = DB::table('validation_entries')->insertGetId([
            'type' => $data['type'],
            'operator_id' => $request->user()->id,
            'responses' => json_encode($data['responses']),
            'decision_signal' => $data['decision_signal'] ?? 'Neutral',
            'decision_reason' => $data['decision_reason'] ?? null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $this->recordAuditLog($request->user(), 'validation.create', [
            'entry_id' => $id,
            'type' => $data['type'],
            'decision_signal' => $data['decision_signal'] ?? 'Neutral',
        ]);

        return response()->json(['entry' => DB::table('validation_entries')->find($id)], 201);
    }

    public function validationUpdate(Request $request, int $entry)
    {
        $this->authorizeValidation($request->user());
        $data = $request->validate([
            'responses' => ['nullable', 'array'],
            'decision_signal' => ['nullable', 'string', 'max:40'],
            'decision_reason' => ['nullable', 'string', 'max:1200'],
        ]);

        DB::table('validation_entries')->where('id', $entry)->update([
            ...collect($data)->map(fn ($value, $key) => $key === 'responses' ? json_encode($value) : $value)->all(),
            'updated_at' => now(),
        ]);
        $this->recordAuditLog($request->user(), 'validation.update', ['entry_id' => $entry]);

        return response()->json(['entry' => DB::table('validation_entries')->find($entry)]);
    }

    public function validationDelete(Request $request, int $entry)
    {
        $this->authorizeValidation($request->user());
        DB::table('validation_entries')->where('id', $entry)->delete();
        $this->recordAuditLog($request->user(), 'validation.delete', ['entry_id' => $entry]);

        return response()->json(['ok' => true]);
    }

    public function adminCreateUser(Request $request)
    {
        abort_unless($request->user()->isAdmin(), 403);
        $data = $request->validate([
            'name' => ['required', 'string', 'max:160'],
            'username' => ['required', 'alpha_dash', 'min:3', 'max:80', Rule::unique('users', 'username')],
            'email' => ['nullable', 'email', 'max:190', Rule::unique('users', 'email')],
            'password' => ['nullable', 'string', 'min:8'],
            'role' => ['required', Rule::in(['client', 'provider', 'customer_service', 'ops', 'admin'])],
            'area' => ['nullable', 'string', 'max:190'],
            'category' => ['nullable', 'string', 'max:160'],
        ]);
        abort_unless($request->user()->canCreateRole($data['role']), 403);
        abort_unless(strtolower($data['username']) !== User::SUPER_ADMIN_USERNAME || ($request->user()->isSuperAdmin() && $data['role'] === 'admin'), 403);

        $user = User::create([
            ...$data,
            'username' => strtolower($data['username']),
            'password' => Hash::make($data['password'] ?? Str::password(12)),
            'account_status' => 'active',
            'data_privacy_consent' => true,
        ]);
        $this->recordAuditLog($request->user(), 'account.create', [
            'target_user_id' => $user->id,
            'target_role' => $user->role,
        ]);

        return response()->json(['user' => $user], 201);
    }

    public function adminUpdateUser(Request $request, User $user)
    {
        abort_unless($request->user()->canManageAdminAccount($user), 403);
        $data = $request->validate([
            'name' => ['nullable', 'string', 'max:160'],
            'email' => ['nullable', 'email', 'max:190', Rule::unique('users', 'email')->ignore($user)],
            'role' => ['nullable', Rule::in(['client', 'provider', 'customer_service', 'ops', 'admin'])],
            'area' => ['nullable', 'string', 'max:190'],
            'category' => ['nullable', 'string', 'max:160'],
            'password' => ['nullable', 'string', 'min:8'],
        ]);
        if (isset($data['role'])) {
            abort_unless($request->user()->canCreateRole($data['role']) || $data['role'] === $user->role, 403);
        }
        if ($user->isSuperAdmin()) {
            unset($data['role'], $data['account_status']);
        }

        if (isset($data['password'])) {
            $data['password'] = Hash::make($data['password']);
        }

        $user->update($data);
        $this->recordAuditLog($request->user(), 'account.edit', [
            'target_user_id' => $user->id,
            'fields' => array_keys($data),
        ]);

        return response()->json(['user' => $user->fresh('providerProfile')]);
    }

    public function adminProviderProfile(Request $request, User $user)
    {
        abort_unless($request->user()->isAdmin(), 403);
        abort_if($user->isStaff(), 422, 'Staff accounts cannot be converted to provider profiles.');
        $request->setUserResolver(fn () => $user);
        $response = $this->saveProvider($request);
        $this->recordAuditLog($request->user(), 'provider_profile.create', ['target_user_id' => $user->id]);

        return $response;
    }

    public function adminUserStatus(Request $request, User $user)
    {
        abort_unless($request->user()->canManageAdminAccount($user), 403);
        $data = $request->validate([
            'status' => ['required', Rule::in(['active', 'suspended', 'banned', 'deleted'])],
            'reason' => ['nullable', 'string', 'max:1200'],
        ]);
        if ($data['status'] === 'deleted') {
            abort_unless($request->user()->canDeleteAdminAccount($user) || !$user->isStaff(), 403);
        }
        abort_if($user->isSuperAdmin() && $data['status'] !== 'active', 403, 'The super admin account cannot be disabled.');

        $user->forceFill([
            'account_status' => $data['status'],
            'status_updated_at' => now(),
            'banned_at' => $data['status'] === 'banned' ? now() : $user->banned_at,
            'deleted_at' => $data['status'] === 'deleted' ? now() : $user->deleted_at,
        ])->save();

        if ($data['status'] !== 'active') {
            DB::table('push_tokens')->where('user_id', $user->id)->delete();
            PushSubscription::query()->where('user_id', $user->id)->delete();
        }
        $this->recordAuditLog($request->user(), 'account.'.$data['status'], [
            'target_user_id' => $user->id,
            'reason' => $data['reason'] ?? null,
        ]);

        return response()->json(['user' => $user]);
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
        return $user->canReadJobConversation($request);
    }

    private function authorizeSupport(User $user): void
    {
        abort_unless($user->canTriageReports(), 403);
    }

    private function authorizeValidation(User $user): void
    {
        abort_unless($user->isAdmin() || $user->isOps(), 403);
    }

    private function recordAuditLog(User $actor, string $action, array $metadata = []): void
    {
        DB::table('audit_logs')->insert([
            'actor_id' => $actor->id,
            'actor_role' => $actor->role,
            'action' => $action,
            'metadata' => json_encode($metadata),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    private function canWriteConversation(ServiceRequest $request, User $user): bool
    {
        return $user->canWriteJobConversation($request);
    }

    private function isBlockedBetween(int $firstUserId, int $secondUserId): bool
    {
        return DB::table('user_blocks')
            ->where(function ($query) use ($firstUserId, $secondUserId) {
                $query->where('blocker_id', $firstUserId)->where('blocked_id', $secondUserId);
            })
            ->orWhere(function ($query) use ($firstUserId, $secondUserId) {
                $query->where('blocker_id', $secondUserId)->where('blocked_id', $firstUserId);
            })
            ->exists();
    }

    private function haversineMeters(float $fromLat, float $fromLng, float $toLat, float $toLng): float
    {
        $earthRadius = 6371000;
        $latDelta = deg2rad($toLat - $fromLat);
        $lngDelta = deg2rad($toLng - $fromLng);
        $a = sin($latDelta / 2) ** 2
            + cos(deg2rad($fromLat)) * cos(deg2rad($toLat)) * sin($lngDelta / 2) ** 2;

        return $earthRadius * 2 * atan2(sqrt($a), sqrt(1 - $a));
    }

    private function mapJobMessage(JobMessage $message): array
    {
        $payload = $message->toArray();
        $payload['body'] = $this->encryption->decrypt($message->body, $message->id);

        return $payload;
    }

    private function mapDirectMessage(object $row): array
    {
        return [
            'id' => $row->id,
            'sender_id' => $row->sender_id,
            'recipient_id' => $row->recipient_id,
            'body' => $this->encryption->decrypt($row->body, $row->id),
            'kind' => $row->kind,
            'created_at' => $row->created_at,
        ];
    }

    private function mapFeedPost(FeedPost $post, array $media = [], $reactions = null, $comments = null): array
    {
        return [
            'id' => $post->id,
            'body' => $post->body,
            'shareCount' => $post->share_count,
            'created_at' => $post->created_at,
            'author' => $post->author,
            'media' => $media,
            'reactions' => collect($reactions)->count(),
            'comments' => collect($comments)->count(),
        ];
    }
}
