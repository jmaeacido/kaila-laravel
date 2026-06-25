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
        abort_unless($viewer->isStaff() || $user->isStaff(), 403);
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

        return response()->json(['messages' => $messages]);
    }

    public function sendDirectMessage(Request $request, User $user)
    {
        $viewer = $request->user();
        abort_unless($viewer->isStaff() || $user->isStaff(), 403);
        abort_if($this->isBlockedBetween($viewer->id, $user->id), 403, 'Messages are blocked between these accounts.');

        $data = $request->validate(['body' => ['required', 'string', 'max:2000']]);
        $id = DB::table('direct_messages')->insertGetId([
            'sender_id' => $viewer->id,
            'recipient_id' => $user->id,
            'body' => $data['body'],
            'kind' => 'text',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->notifications->notify($user, 'direct.message', 'New direct message', "{$viewer->name}: " . str($data['body'])->limit(80), ['directUserId' => $viewer->id], $viewer);

        return response()->json(['message' => DB::table('direct_messages')->find($id)], 201);
    }

    public function directPresence(Request $request, User $user)
    {
        abort_unless($request->user()->isStaff() || $user->isStaff(), 403);

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
        abort_unless($request->user()->isStaff(), 403);
        $data = $request->validate([
            'status' => ['required', 'string', 'max:40'],
            'resolution_note' => ['nullable', 'string', 'max:1200'],
        ]);

        DB::table('moderation_reports')->where('id', $report)->update([
            'status' => $data['status'],
            'details' => DB::raw('COALESCE(details, "")'),
            'updated_at' => now(),
        ]);

        return response()->json(['ok' => true]);
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
        return response()->json([
            'feed' => FeedPost::query()->with('author:id,name,username,role')->where('visibility', 'public')->latest()->limit(50)->get(),
        ]);
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

        return response()->json(['ok' => true, 'shareCount' => $feedPost->share_count + 1]);
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
            'navigationState' => DB::table('job_navigation_states')->where('service_request_id', $serviceRequest->id)->first(),
        ]);
    }

    public function activity(Request $request)
    {
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
        $data = $request->validate([
            'type' => ['required', Rule::in(['client_survey', 'provider_interview'])],
            'responses' => ['required', 'array'],
        ]);
        $score = count(array_filter($data['responses']));
        $signal = $score >= 5 ? 'Positive' : ($score <= 1 ? 'Concern' : 'Neutral');

        return response()->json(['decisionSignal' => $signal, 'reason' => 'Local Laravel scoring preserved for offline validation when AI analytics are not configured.']);
    }

    public function analyticsInsights()
    {
        return response()->json([
            'summary' => 'KAILA Laravel is collecting marketplace activity locally.',
            'risks' => ['Review provider response time and unresolved disputes before scaling.'],
            'actions' => ['Keep seeding provider coverage in active categories.'],
        ]);
    }

    public function validationStore(Request $request)
    {
        abort_unless($request->user()->isStaff(), 403);
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

        return response()->json(['entry' => DB::table('validation_entries')->find($id)], 201);
    }

    public function validationUpdate(Request $request, int $entry)
    {
        abort_unless($request->user()->isStaff(), 403);
        $data = $request->validate([
            'responses' => ['nullable', 'array'],
            'decision_signal' => ['nullable', 'string', 'max:40'],
            'decision_reason' => ['nullable', 'string', 'max:1200'],
        ]);

        DB::table('validation_entries')->where('id', $entry)->update([
            ...collect($data)->map(fn ($value, $key) => $key === 'responses' ? json_encode($value) : $value)->all(),
            'updated_at' => now(),
        ]);

        return response()->json(['entry' => DB::table('validation_entries')->find($entry)]);
    }

    public function validationDelete(Request $request, int $entry)
    {
        abort_unless($request->user()->isStaff(), 403);
        DB::table('validation_entries')->where('id', $entry)->delete();

        return response()->json(['ok' => true]);
    }

    public function adminCreateUser(Request $request)
    {
        abort_unless($request->user()->isStaff(), 403);
        $data = $request->validate([
            'name' => ['required', 'string', 'max:160'],
            'username' => ['required', 'alpha_dash', 'min:3', 'max:80', Rule::unique('users', 'username')],
            'email' => ['nullable', 'email', 'max:190', Rule::unique('users', 'email')],
            'password' => ['nullable', 'string', 'min:8'],
            'role' => ['required', Rule::in(['client', 'provider', 'customer_service', 'admin'])],
            'area' => ['nullable', 'string', 'max:190'],
            'category' => ['nullable', 'string', 'max:160'],
        ]);

        $user = User::create([
            ...$data,
            'username' => strtolower($data['username']),
            'password' => Hash::make($data['password'] ?? Str::password(12)),
            'account_status' => 'active',
            'data_privacy_consent' => true,
        ]);

        return response()->json(['user' => $user], 201);
    }

    public function adminUpdateUser(Request $request, User $user)
    {
        abort_unless($request->user()->isStaff(), 403);
        $data = $request->validate([
            'name' => ['nullable', 'string', 'max:160'],
            'email' => ['nullable', 'email', 'max:190', Rule::unique('users', 'email')->ignore($user)],
            'role' => ['nullable', Rule::in(['client', 'provider', 'customer_service', 'admin'])],
            'area' => ['nullable', 'string', 'max:190'],
            'category' => ['nullable', 'string', 'max:160'],
            'password' => ['nullable', 'string', 'min:8'],
        ]);

        if (isset($data['password'])) {
            $data['password'] = Hash::make($data['password']);
        }

        $user->update($data);

        return response()->json(['user' => $user->fresh('providerProfile')]);
    }

    public function adminProviderProfile(Request $request, User $user)
    {
        abort_unless($request->user()->isStaff(), 403);
        $request->setUserResolver(fn () => $user);

        return $this->saveProvider($request);
    }

    public function adminUserStatus(Request $request, User $user)
    {
        abort_unless($request->user()->isStaff(), 403);
        $data = $request->validate([
            'status' => ['required', Rule::in(['active', 'suspended', 'banned', 'deleted'])],
            'reason' => ['nullable', 'string', 'max:1200'],
        ]);

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
        return $request->isParticipant($user) || $request->offers()->where('provider_id', $user->id)->exists();
    }

    private function canWriteConversation(ServiceRequest $request, User $user): bool
    {
        return $request->isParticipant($user)
            && in_array($request->status, ['Accepted', 'In Progress', 'Provider Marked Done', 'Revision Requested', 'Disputed'], true);
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
}
