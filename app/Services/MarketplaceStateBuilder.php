<?php

namespace App\Services;

use App\Models\ServiceRequest;
use App\Models\User;
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

    public function supportDesk(): ?User
    {
        return User::query()
            ->where('role', 'customer_service')
            ->where('account_status', 'active')
            ->whereNull('deleted_at')
            ->first(['id', 'name', 'username', 'role']);
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
}
