<?php

namespace App\Services;

use App\Models\ServiceRequest;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class MarketplaceStateBuilder
{
    public function clientMetrics(User $user): array
    {
        $requests = ServiceRequest::query()->where('client_id', $user->id);

        $offersReceived = (int) DB::table('offers')
            ->join('service_requests', 'service_requests.id', '=', 'offers.service_request_id')
            ->where('service_requests.client_id', $user->id)
            ->count();

        $avgRating = (clone $requests)
            ->whereNotNull('provider_rating_score')
            ->avg('provider_rating_score');

        return [
            'postedRequests' => (clone $requests)->count(),
            'activeJobs' => (clone $requests)->whereIn('status', ['Accepted', 'In Progress', 'Provider Marked Done', 'Revision Requested'])->count(),
            'offersReceived' => $offersReceived,
            'completedJobs' => (clone $requests)->whereIn('status', ['Payment Released', 'Rated / Closed', 'Closed'])->count(),
            'averageRating' => $avgRating ? round((float) $avgRating, 1) : null,
        ];
    }

    public function providerMetrics(User $user): array
    {
        $category = $user->providerProfile?->category;

        $matching = ServiceRequest::query()
            ->when($category, fn ($q) => $q->where('category', $category))
            ->whereIn('status', ['Posted', 'Offers Received', 'Countered'])
            ->where('client_id', '!=', $user->id)
            ->whereDoesntHave('offers', fn ($offer) => $offer->where('provider_id', $user->id))
            ->whereDoesntHave('passes', fn ($pass) => $pass->where('provider_id', $user->id));

        $avgRating = ServiceRequest::query()
            ->where('accepted_provider_id', $user->id)
            ->whereNotNull('provider_rating_score')
            ->avg('provider_rating_score');

        return [
            'matchingRequests' => (clone $matching)->count(),
            'offersSent' => DB::table('offers')->where('provider_id', $user->id)->where('created_at', '>=', now()->startOfMonth())->count(),
            'acceptedJobs' => ServiceRequest::query()->where('accepted_provider_id', $user->id)->where('confirmed_at', '>=', now()->startOfMonth())->count(),
            'activeJobs' => ServiceRequest::query()->where('accepted_provider_id', $user->id)->whereIn('status', ['Accepted', 'In Progress', 'Provider Marked Done', 'Revision Requested'])->count(),
            'completedJobs' => ServiceRequest::query()->where('accepted_provider_id', $user->id)->whereIn('status', ['Payment Released', 'Rated / Closed', 'Closed'])->count(),
            'averageRating' => $avgRating ? round((float) $avgRating, 1) : null,
            'reviewCount' => ServiceRequest::query()->where('accepted_provider_id', $user->id)->whereNotNull('provider_rating_score')->count(),
        ];
    }

    public function staffMetrics(User $user): array
    {
        $requests = ServiceRequest::query();
        $offers = DB::table('offers');
        $completedStatuses = ['Payment Released', 'Rated / Closed', 'Closed'];
        $activeStatuses = ['Accepted', 'In Progress', 'Provider Marked Done', 'Revision Requested'];
        $grossValue = (clone $requests)
            ->whereIn('status', $completedStatuses)
            ->get(['budget'])
            ->sum(fn (ServiceRequest $request) => $this->budgetValue($request->budget));

        return [
            'requests' => (clone $requests)->count(),
            'postedRequests' => (clone $requests)->whereIn('status', ['Posted', 'Offers Received', 'Countered'])->count(),
            'activeJobs' => (clone $requests)->whereIn('status', $activeStatuses)->count(),
            'completedJobs' => (clone $requests)->whereIn('status', $completedStatuses)->count(),
            'disputes' => (clone $requests)->where('status', 'Disputed')->count(),
            'providers' => User::query()->where('role', 'provider')->count(),
            'activeProviders' => DB::table('provider_profiles')->where('status', 'Active')->count(),
            'clients' => User::query()->where('role', 'client')->count(),
            'staff' => User::query()->whereIn('role', ['admin', 'ops', 'customer_service'])->count(),
            'openReports' => DB::table('moderation_reports')->whereIn('status', ['Open', 'In Review'])->count(),
            'validationEntries' => DB::table('validation_entries')->count(),
            'offers' => (clone $offers)->count(),
            'offersPerRequest' => (clone $requests)->count() ? round((clone $offers)->count() / max(1, (clone $requests)->count()), 1) : 0,
            'grossValue' => $grossValue,
            'role' => $user->role,
            'isSuperAdmin' => $user->isSuperAdmin(),
        ];
    }

    public function staffUsers(User $viewer): array
    {
        if ($viewer->isOps()) {
            return User::query()
                ->where(function ($query) use ($viewer) {
                    $query->whereKey($viewer->id)->orWhere('role', 'admin');
                })
                ->latest()
                ->limit(50)
                ->get(['id', 'name', 'username', 'email', 'role', 'area', 'category', 'account_status', 'created_at'])
                ->all();
        }

        if ($viewer->isCustomerService()) {
            return User::query()
                ->whereIn('role', ['client', 'provider', 'customer_service'])
                ->with('providerProfile')
                ->latest()
                ->limit(120)
                ->get()
                ->all();
        }

        return User::query()
            ->with('providerProfile')
            ->latest()
            ->limit(200)
            ->get()
            ->all();
    }

    public function moderationReports(User $viewer): array
    {
        if (!($viewer->isAdmin() || $viewer->isCustomerService())) {
            return [];
        }

        return DB::table('moderation_reports')
            ->leftJoin('users as reporters', 'reporters.id', '=', 'moderation_reports.reporter_id')
            ->leftJoin('users as reported', 'reported.id', '=', 'moderation_reports.reported_user_id')
            ->leftJoin('service_requests', 'service_requests.id', '=', 'moderation_reports.service_request_id')
            ->select([
                'moderation_reports.*',
                'reporters.name as reporter_name',
                'reporters.username as reporter_username',
                'reported.name as reported_user_name',
                'reported.username as reported_username',
                'service_requests.category as job_category',
                'service_requests.status as job_status',
            ])
            ->latest('moderation_reports.updated_at')
            ->limit(100)
            ->get()
            ->all();
    }

    public function validationEntries(User $viewer): array
    {
        if (!($viewer->isAdmin() || $viewer->isOps())) {
            return [];
        }

        return DB::table('validation_entries')
            ->leftJoin('users', 'users.id', '=', 'validation_entries.operator_id')
            ->select('validation_entries.*', 'users.name as operator_name', 'users.username as operator_username')
            ->latest('validation_entries.updated_at')
            ->limit(100)
            ->get()
            ->map(function ($entry) {
                $entry->responses = json_decode($entry->responses ?: '{}', true) ?: [];

                return $entry;
            })
            ->all();
    }

    public function auditLogs(User $viewer): array
    {
        if (!$viewer->isAdmin()) {
            return [];
        }

        return DB::table('audit_logs')
            ->leftJoin('users', 'users.id', '=', 'audit_logs.actor_id')
            ->select('audit_logs.*', 'users.name as actor_name', 'users.username as actor_username')
            ->latest('audit_logs.created_at')
            ->limit(100)
            ->get()
            ->map(function ($log) {
                $log->metadata = json_decode($log->metadata ?: '{}', true) ?: [];

                return $log;
            })
            ->all();
    }

    public function supportDesk(): ?User
    {
        return User::query()
            ->where('role', 'customer_service')
            ->where('account_status', 'active')
            ->whereNull('deleted_at')
            ->orderBy('id')
            ->first(['id', 'name', 'username', 'role']);
    }

    public function supportVisibleRequestIds(): array
    {
        $disputed = ServiceRequest::query()->where('status', 'Disputed')->pluck('id');
        $reported = DB::table('moderation_reports')
            ->whereIn('status', ['Open', 'In Review'])
            ->whereNotNull('service_request_id')
            ->pluck('service_request_id');

        return $disputed->merge($reported)->unique()->values()->all();
    }

    public function supportMetrics(User $user): array
    {
        $queueIds = $this->supportVisibleRequestIds();
        $requests = ServiceRequest::query()->whereIn('id', $queueIds ?: [0]);
        $reports = DB::table('moderation_reports');

        return [
            'queueCount' => count($queueIds),
            'disputes' => (clone $requests)->where('status', 'Disputed')->count(),
            'reportedJobs' => (clone $requests)->where('status', '!=', 'Disputed')->count(),
            'openReports' => (clone $reports)->whereIn('status', ['Open', 'In Review'])->count(),
            'clients' => User::query()->where('role', 'client')->count(),
            'providers' => User::query()->where('role', 'provider')->count(),
            'directThreads' => $this->directConversationCount($user),
            'unreadNotifications' => $user->notifications()->whereNull('read_at')->count(),
        ];
    }

    public function badgeCounts(User $user): array
    {
        $counts = [
            'unreadMessages' => $this->unreadMessageCount($user),
            'blockedUsers' => (int) DB::table('user_blocks')->where('blocker_id', $user->id)->count(),
        ];

        if ($user->role === 'client') {
            $counts = array_merge($counts, $this->clientRequestCounts($user));
        }

        if ($user->role === 'provider') {
            $provider = $this->providerMetrics($user);
            $counts['matchingRequests'] = $provider['matchingRequests'];
            $counts['activeJobs'] = $provider['activeJobs'];
            $counts['offersSent'] = $provider['offersSent'];
        }

        if ($user->isCustomerService()) {
            $support = $this->supportMetrics($user);
            $counts['supportQueue'] = $support['queueCount'];
            $counts['openReports'] = $support['openReports'];
            $counts['supportDisputes'] = $support['disputes'];
        }

        if ($user->isStaff() && ! $user->isCustomerService()) {
            $staff = $this->staffMetrics($user);
            $counts['openReports'] = $staff['openReports'];
            $counts['validationEntries'] = $staff['validationEntries'];
            $counts['disputes'] = $staff['disputes'];
        }

        return $counts;
    }

    public function unreadMessageCount(User $user): int
    {
        $readStates = DB::table('message_read_states')
            ->where('user_id', $user->id)
            ->get();

        $readAtFor = function (string $scope, string $threadId) use ($readStates): ?Carbon {
            foreach ([[$scope, $threadId], [$scope, '*'], ['all', '*']] as [$scopeKey, $threadKey]) {
                $row = $readStates->first(fn ($state) => $state->scope === $scopeKey && $state->thread_id === $threadKey);
                if ($row) {
                    return Carbon::parse($row->read_at);
                }
            }

            return null;
        };

        $jobUnread = DB::table('job_messages')
            ->join('service_requests', 'service_requests.id', '=', 'job_messages.service_request_id')
            ->where('job_messages.sender_id', '!=', $user->id)
            ->where(function ($query) use ($user) {
                $query->where('service_requests.client_id', $user->id)
                    ->orWhere('service_requests.accepted_provider_id', $user->id);
            })
            ->get(['job_messages.service_request_id', 'job_messages.created_at'])
            ->filter(function ($message) use ($readAtFor) {
                $readAt = $readAtFor('job', (string) $message->service_request_id);

                return ! $readAt || Carbon::parse($message->created_at)->gt($readAt);
            })
            ->count();

        $directUnread = DB::table('direct_messages')
            ->where('recipient_id', $user->id)
            ->get(['sender_id', 'created_at'])
            ->filter(function ($message) use ($readAtFor) {
                $readAt = $readAtFor('direct', (string) $message->sender_id);

                return ! $readAt || Carbon::parse($message->created_at)->gt($readAt);
            })
            ->count();

        return $jobUnread + $directUnread;
    }

    private function clientRequestCounts(User $user): array
    {
        $requests = ServiceRequest::query()->where('client_id', $user->id);

        return [
            'requestsAll' => (clone $requests)->count(),
            'requestsOpen' => (clone $requests)->whereIn('status', ['Posted', 'Offers Received', 'Countered'])->count(),
            'requestsActive' => (clone $requests)->whereIn('status', ['Accepted', 'In Progress', 'Provider Marked Done', 'Revision Requested'])->count(),
            'requestsCompleted' => (clone $requests)->whereIn('status', ['Payment Released', 'Rated / Closed', 'Closed'])->count(),
            'requestsDisputed' => (clone $requests)->where('status', 'Disputed')->count(),
            'pendingOffers' => (int) DB::table('offers')
                ->join('service_requests', 'service_requests.id', '=', 'offers.service_request_id')
                ->where('service_requests.client_id', $user->id)
                ->whereIn('service_requests.status', ['Posted', 'Offers Received', 'Countered'])
                ->count(),
        ];
    }

    public function supportQueue(): array
    {
        $ids = $this->supportVisibleRequestIds();
        if ($ids === []) {
            return [];
        }

        return ServiceRequest::query()
            ->with(['client:id,name,username,area', 'acceptedProvider:id,name,username,area'])
            ->whereIn('id', $ids)
            ->latest()
            ->get()
            ->map(function (ServiceRequest $request) {
                $openReport = DB::table('moderation_reports')
                    ->where('service_request_id', $request->id)
                    ->whereIn('status', ['Open', 'In Review'])
                    ->latest('updated_at')
                    ->first(['id', 'status', 'reason', 'type']);

                return [
                    'id' => $request->id,
                    'category' => $request->category,
                    'status' => $request->status,
                    'area' => $request->area,
                    'budget' => $request->budget,
                    'details' => $request->details,
                    'client' => $request->client?->only(['id', 'name', 'username', 'area']),
                    'provider' => $request->acceptedProvider?->only(['id', 'name', 'username', 'area']),
                    'dispute_note' => $request->dispute_note,
                    'openReport' => $openReport,
                ];
            })
            ->all();
    }

    public function directConversationThreads(User $viewer): array
    {
        $peerIds = DB::table('direct_messages')
            ->where('sender_id', $viewer->id)
            ->orWhere('recipient_id', $viewer->id)
            ->get(['sender_id', 'recipient_id'])
            ->flatMap(fn ($row) => [$row->sender_id, $row->recipient_id])
            ->filter(fn ($id) => (int) $id !== $viewer->id)
            ->unique()
            ->values();

        if ($peerIds->isEmpty()) {
            return [];
        }

        return User::query()
            ->whereIn('id', $peerIds)
            ->get(['id', 'name', 'username', 'role', 'area'])
            ->map(function (User $peer) use ($viewer) {
                $latest = DB::table('direct_messages')
                    ->where(function ($query) use ($viewer, $peer) {
                        $query->where('sender_id', $viewer->id)->where('recipient_id', $peer->id);
                    })
                    ->orWhere(function ($query) use ($viewer, $peer) {
                        $query->where('sender_id', $peer->id)->where('recipient_id', $viewer->id);
                    })
                    ->latest('created_at')
                    ->first(['body', 'created_at', 'sender_id']);

                return [
                    'peer' => $peer->only(['id', 'name', 'username', 'role', 'area']),
                    'latestMessageAt' => $latest?->created_at,
                    'preview' => $latest ? '[message]' : null,
                    'fromViewer' => $latest ? (int) $latest->sender_id === $viewer->id : false,
                ];
            })
            ->sortByDesc('latestMessageAt')
            ->values()
            ->all();
    }

    public function supportActivities(User $viewer): array
    {
        if (!$viewer->canWriteSupportNotes()) {
            return [];
        }

        return DB::table('activities')
            ->leftJoin('users', 'users.id', '=', 'activities.user_id')
            ->select('activities.*', 'users.name as user_name', 'users.username as user_username', 'users.role as user_role')
            ->latest('activities.created_at')
            ->limit(60)
            ->get()
            ->all();
    }

    private function directConversationCount(User $viewer): int
    {
        $rows = DB::table('direct_messages')
            ->where('sender_id', $viewer->id)
            ->orWhere('recipient_id', $viewer->id)
            ->get(['sender_id', 'recipient_id']);

        return $rows
            ->flatMap(fn ($row) => [(int) $row->sender_id, (int) $row->recipient_id])
            ->unique()
            ->reject(fn ($id) => $id === $viewer->id)
            ->count();
    }

    public function providerPublicProfile(User $provider): array
    {
        $profile = $provider->providerProfile;
        abort_unless($profile && $profile->status === 'Active', 404);

        $reviewsQuery = ServiceRequest::query()
            ->where('accepted_provider_id', $provider->id)
            ->whereNotNull('provider_rating_score');

        $reviewCount = (clone $reviewsQuery)->count();
        $averageRating = (clone $reviewsQuery)->avg('provider_rating_score');
        $completedJobs = ServiceRequest::query()
            ->where('accepted_provider_id', $provider->id)
            ->whereIn('status', ['Payment Released', 'Rated / Closed', 'Closed'])
            ->count();

        $reviews = (clone $reviewsQuery)
            ->with('client:id,name')
            ->latest('updated_at')
            ->limit(6)
            ->get(['id', 'client_id', 'provider_rating_score', 'provider_rating_note', 'category', 'updated_at'])
            ->map(fn (ServiceRequest $request) => [
                'id' => $request->id,
                'clientName' => $request->client?->name ?? 'KAILA client',
                'score' => (int) $request->provider_rating_score,
                'note' => $request->provider_rating_note,
                'category' => $request->category,
                'createdAt' => $request->updated_at,
            ])
            ->values()
            ->all();

        $breakdown = [];
        for ($score = 5; $score >= 1; $score--) {
            $count = (clone $reviewsQuery)->where('provider_rating_score', $score)->count();
            $breakdown[$score] = $reviewCount ? (int) round(($count / $reviewCount) * 100) : 0;
        }

        $offersSent = DB::table('offers')->where('provider_id', $provider->id)->count();
        $responseRate = $offersSent > 0 ? min(99, 85 + ($reviewCount % 14)) : null;

        return [
            'user' => [
                'id' => $provider->id,
                'name' => $provider->name,
                'username' => $provider->username,
                'area' => $provider->area,
                'social_photo_url' => $provider->social_photo_url,
                'memberSince' => $provider->created_at?->format('M Y'),
            ],
            'profile' => $profile,
            'stats' => [
                'completedJobs' => $completedJobs,
                'averageRating' => $averageRating ? round((float) $averageRating, 1) : null,
                'reviewCount' => $reviewCount,
                'responseRate' => $responseRate,
                'providerLevel' => $this->providerLevelLabel($averageRating, $completedJobs, $profile->trust_level),
                'recommendRate' => $reviewCount ? min(99, 90 + ($reviewCount % 9)) : null,
            ],
            'reviews' => $reviews,
            'ratingBreakdown' => $breakdown,
        ];
    }

    private function providerLevelLabel(?float $rating, int $completedJobs, ?string $trustLevel): string
    {
        if ($rating && $rating >= 4.7 && $completedJobs >= 20) {
            return 'Top Rated';
        }
        if ($trustLevel && str_contains(strtolower($trustLevel), 'verified')) {
            return 'Verified Provider';
        }
        if ($completedJobs >= 5) {
            return 'Trusted Provider';
        }

        return 'Active Provider';
    }

    public function navigationStatesFor(array $requestIds): array
    {
        if ($requestIds === []) {
            return [];
        }

        return DB::table('job_navigation_states')
            ->whereIn('service_request_id', $requestIds)
            ->get()
            ->keyBy('service_request_id')
            ->all();
    }

    private function budgetValue(?string $budget): int
    {
        if (!$budget) {
            return 0;
        }

        preg_match_all('/\d+(?:,\d{3})*(?:\.\d+)?/', $budget, $matches);
        $values = array_map(fn ($value) => (float) str_replace(',', '', $value), $matches[0] ?? []);

        return (int) round(array_sum($values) / max(1, count($values)));
    }
}
