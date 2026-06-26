<?php

namespace App\Services;

use App\Models\ServiceRequest;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;

class NavigationService
{
    public const TRAVEL_STATUSES = ['Accepted', 'In Progress', 'Revision Requested'];

    public function start(ServiceRequest $request, User $provider): object
    {
        abort_unless(
            $request->accepted_provider_id === $provider->id,
            403,
            'Only the accepted provider can start navigation for this job.',
        );
        abort_unless(
            in_array($request->status, self::TRAVEL_STATUSES, true),
            422,
            sprintf('Navigation is unavailable while the job is %s.', strtolower($request->status)),
        );

        $destinationLat = $request->job_lat;
        $destinationLng = $request->job_lng;

        DB::table('job_navigation_states')->updateOrInsert(
            ['service_request_id' => $request->id],
            [
                'provider_id' => $provider->id,
                'status' => 'traveling',
                'destination_lat' => $destinationLat,
                'destination_lng' => $destinationLng,
                'arrival_state' => 'on_the_way',
                'started_at' => now(),
                'stopped_at' => null,
                'updated_at' => now(),
                'created_at' => now(),
            ]
        );

        return $this->stateFor($request);
    }

    public function updateLocation(ServiceRequest $request, User $provider, float $lat, float $lng): object
    {
        abort_unless($request->accepted_provider_id === $provider->id, 403);

        $row = DB::table('job_navigation_states')->where('service_request_id', $request->id)->first();
        abort_unless($row && $row->status === 'traveling', 422);

        $metrics = $this->metrics($lat, $lng, $row->destination_lat, $row->destination_lng);
        $arrivalState = $this->arrivalState($metrics['distanceMeters']);

        DB::table('job_navigation_states')->where('service_request_id', $request->id)->update([
            'provider_lat' => $lat,
            'provider_lng' => $lng,
            'distance_meters' => $metrics['distanceMeters'],
            'eta_minutes' => $metrics['etaMinutes'],
            'arrival_state' => $arrivalState,
            'last_location_at' => now(),
            'updated_at' => now(),
        ]);

        return $this->stateFor($request);
    }

    public function stop(ServiceRequest $request, User $provider): object
    {
        abort_unless($request->accepted_provider_id === $provider->id, 403);

        DB::table('job_navigation_states')->where('service_request_id', $request->id)->update([
            'status' => 'stopped',
            'arrival_state' => 'stopped',
            'stopped_at' => now(),
            'updated_at' => now(),
        ]);

        return $this->stateFor($request);
    }

    public function stateFor(ServiceRequest $request): object
    {
        $row = DB::table('job_navigation_states')->where('service_request_id', $request->id)->first();

        return $row ?: (object) [
            'service_request_id' => $request->id,
            'status' => 'waiting',
            'arrival_state' => 'waiting',
        ];
    }

    public function metrics(?float $fromLat, ?float $fromLng, ?float $toLat, ?float $toLng): array
    {
        if ($fromLat === null || $fromLng === null || $toLat === null || $toLng === null) {
            return ['distanceMeters' => null, 'etaMinutes' => null, 'source' => 'unknown'];
        }

        $osrmUrl = config('kaila.route_distance_url');
        if ($osrmUrl) {
            try {
                $response = Http::timeout(5)->get($osrmUrl, [
                    'fromLat' => $fromLat,
                    'fromLng' => $fromLng,
                    'toLat' => $toLat,
                    'toLng' => $toLng,
                ]);

                if ($response->successful()) {
                    $payload = $response->json();
                    if (isset($payload['distanceMeters'])) {
                        return [
                            'distanceMeters' => (int) $payload['distanceMeters'],
                            'etaMinutes' => max(1, (int) round(($payload['durationSeconds'] ?? 0) / 60)),
                            'source' => $payload['source'] ?? 'osrm',
                        ];
                    }
                }
            } catch (\Throwable) {
                // fall through to haversine
            }
        }

        $distanceMeters = (int) round($this->haversineMeters($fromLat, $fromLng, $toLat, $toLng));

        return [
            'distanceMeters' => $distanceMeters,
            'etaMinutes' => max(1, (int) round($distanceMeters / 500)),
            'source' => 'haversine',
        ];
    }

    private function arrivalState(?int $distanceMeters): string
    {
        if ($distanceMeters === null) {
            return 'on_the_way';
        }

        return match (true) {
            $distanceMeters <= 120 => 'arrived',
            $distanceMeters <= 500 => 'nearby',
            default => 'on_the_way',
        };
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
