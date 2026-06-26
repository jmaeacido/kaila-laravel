<?php

namespace App\Services;

use App\Models\Offer;
use App\Models\ServiceRequest;
use App\Models\User;
use Illuminate\Support\Collection;

class MarketplaceWorkflow
{
    public function autoConfirmDue(NotificationService $notifications): int
    {
        $requests = ServiceRequest::query()
            ->with(['client', 'acceptedProvider'])
            ->where('status', 'Provider Marked Done')
            ->whereNotNull('auto_confirm_at')
            ->where('auto_confirm_at', '<=', now())
            ->get();

        $requests->each(function (ServiceRequest $request) use ($notifications): void {
            $this->releasePayment($request);

            $participants = new Collection([$request->client, $request->acceptedProvider]);

            $participants
                ->filter()
                ->each(fn (User $user) => $notifications->notify(
                    $user,
                    'Payment auto-released',
                    "KAILA auto-confirmed {$request->category} after the review window.",
                    'request',
                    $request
                ));
        });

        return $requests->count();
    }

    public function acceptOffer(ServiceRequest $request, Offer $offer): void
    {
        $request->forceFill([
            'accepted_provider_id' => $offer->provider_id,
            'status' => 'Accepted',
            'confirmed_at' => now(),
        ])->save();

        $request->offers()
            ->whereKeyNot($offer->id)
            ->update(['status' => 'declined']);

        $offer->forceFill(['status' => 'accepted'])->save();
    }

    public function perform(ServiceRequest $request, User $actor, string $action, array $payload = []): void
    {
        $supportActions = [
            'support_resume_job',
            'support_request_revision',
            'support_release_payment',
            'support_cancel_request',
            'resolve_dispute',
        ];

        abort_if($actor->isAdmin() && !in_array($action, ['rate'], true), 403, 'Admins cannot perform job actions.');
        abort_if(in_array($action, $supportActions, true) && !$actor->canResolveDisputes(), 403);

        match ($action) {
            'start' => $this->start($request, $actor),
            'provider_complete' => $this->providerComplete($request, $actor, $payload['proof_note'] ?? null),
            'client_complete' => $this->clientComplete($request, $actor),
            'request_revision' => $this->revision($request, $actor, $payload['revision_note'] ?? null),
            'cancel' => $this->cancel($request, $actor),
            'dispute' => $this->dispute($request, $actor, $payload['dispute_note'] ?? null),
            'resolve_dispute' => $this->resolveDispute($request, $actor),
            'support_resume_job' => $this->supportResumeJob($request, $actor, $payload['note'] ?? null),
            'support_request_revision' => $this->supportRequestRevision($request, $actor, $payload['revision_note'] ?? null),
            'support_release_payment' => $this->supportReleasePayment($request, $actor, $payload['note'] ?? null),
            'support_cancel_request' => $this->supportCancelRequest($request, $actor, $payload['note'] ?? null),
            'rate' => $this->rate($request, $actor, $payload),
            default => abort(422, 'Unsupported job action.'),
        };
    }

    private function start(ServiceRequest $request, User $actor): void
    {
        abort_unless($request->accepted_provider_id === $actor->id, 403);
        abort_unless(in_array($request->status, ['Accepted', 'Revision Requested'], true), 422);

        $request->forceFill([
            'status' => 'In Progress',
            'provider_started_at' => now(),
        ])->save();
    }

    private function providerComplete(ServiceRequest $request, User $actor, ?string $proofNote): void
    {
        abort_unless($request->accepted_provider_id === $actor->id, 403);
        abort_unless(in_array($request->status, ['Accepted', 'In Progress', 'Revision Requested'], true), 422);

        $request->forceFill([
            'status' => 'Provider Marked Done',
            'provider_done_at' => now(),
            'auto_confirm_at' => now()->addHours((int) config('kaila.auto_confirm_hours')),
            'proof_note' => $proofNote,
        ])->save();
    }

    private function clientComplete(ServiceRequest $request, User $actor): void
    {
        abort_unless($request->client_id === $actor->id || $actor->isCustomerService(), 403);
        abort_unless($request->status === 'Provider Marked Done', 422);

        $this->releasePayment($request);
    }

    private function revision(ServiceRequest $request, User $actor, ?string $note): void
    {
        abort_unless($request->client_id === $actor->id || $actor->isCustomerService(), 403);
        abort_unless($request->status === 'Provider Marked Done', 422);

        $request->forceFill([
            'status' => 'Revision Requested',
            'revision_note' => $note,
            'auto_confirm_at' => null,
        ])->save();
    }

    private function cancel(ServiceRequest $request, User $actor): void
    {
        abort_unless($request->client_id === $actor->id || $actor->isCustomerService(), 403);
        abort_unless(in_array($request->status, ['Posted', 'Offers Received', 'Countered', 'Accepted'], true), 422);

        $request->forceFill(['status' => 'Cancelled'])->save();
    }

    private function dispute(ServiceRequest $request, User $actor, ?string $note): void
    {
        abort_unless($request->isParticipant($actor), 403);
        abort_unless(in_array($request->status, ['Accepted', 'In Progress', 'Provider Marked Done', 'Payment Released'], true), 422);

        $request->forceFill([
            'status' => 'Disputed',
            'dispute_note' => $note,
            'auto_confirm_at' => null,
        ])->save();
    }

    private function resolveDispute(ServiceRequest $request, User $actor): void
    {
        abort_unless($actor->canResolveDisputes(), 403);
        abort_unless($request->status === 'Disputed', 422);

        $request->forceFill(['status' => 'Resolved'])->save();
    }

    private function supportResumeJob(ServiceRequest $request, User $actor, ?string $note): void
    {
        abort_unless($request->status === 'Disputed', 422);

        $request->forceFill([
            'status' => 'In Progress',
            'dispute_note' => trim(($request->dispute_note ? $request->dispute_note."\n" : '').'Support: '.($note ?: 'Job resumed by support.')),
        ])->save();
    }

    private function supportRequestRevision(ServiceRequest $request, User $actor, ?string $note): void
    {
        abort_unless($request->status === 'Disputed', 422);

        $request->forceFill([
            'status' => 'Revision Requested',
            'revision_note' => $note ?: 'Revision requested by support.',
            'dispute_note' => trim(($request->dispute_note ? $request->dispute_note."\n" : '').'Support requested revision.'),
        ])->save();
    }

    private function supportReleasePayment(ServiceRequest $request, User $actor, ?string $note): void
    {
        abort_unless(in_array($request->status, ['Disputed', 'Provider Marked Done'], true), 422);

        $this->releasePayment($request);
        if ($note) {
            $request->forceFill([
                'dispute_note' => trim(($request->dispute_note ? $request->dispute_note."\n" : '').'Support: '.$note),
            ])->save();
        }
    }

    private function supportCancelRequest(ServiceRequest $request, User $actor, ?string $note): void
    {
        abort_unless(in_array($request->status, ['Disputed', 'Accepted', 'In Progress', 'Revision Requested', 'Provider Marked Done'], true), 422);

        $request->forceFill([
            'status' => 'Cancelled',
            'dispute_note' => trim(($request->dispute_note ? $request->dispute_note."\n" : '').'Support: '.($note ?: 'Cancelled by support.')),
        ])->save();
    }

    private function rate(ServiceRequest $request, User $actor, array $payload): void
    {
        abort_unless($request->status === 'Payment Released', 422);

        $score = max(1, min(5, (int) ($payload['score'] ?? 5)));
        $note = trim((string) ($payload['note'] ?? ''));

        if ($request->client_id === $actor->id) {
            $request->forceFill([
                'client_rating_score' => $score,
                'client_rating_note' => $note,
                'client_rated_at' => now(),
            ])->save();
        } elseif ($request->accepted_provider_id === $actor->id) {
            $request->forceFill([
                'provider_rating_score' => $score,
                'provider_rating_note' => $note,
                'provider_rated_at' => now(),
            ])->save();
        } else {
            abort(403);
        }

        if ($request->fresh()->client_rated_at && $request->fresh()->provider_rated_at) {
            $request->forceFill(['status' => 'Rated / Closed'])->save();
        }
    }

    private function releasePayment(ServiceRequest $request): void
    {
        $request->forceFill([
            'status' => 'Payment Released',
            'auto_confirm_at' => null,
            'payment_released_at' => now(),
            'rating_deadline_at' => now()->addDays((int) config('kaila.rating_window_days')),
        ])->save();
    }
}
