<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ServiceRequest extends Model
{
    protected $fillable = [
        'client_id',
        'accepted_provider_id',
        'category',
        'urgency',
        'area',
        'budget',
        'preferred_schedule',
        'contact_method',
        'exact_location_notes',
        'job_lat',
        'job_lng',
        'job_location_source',
        'permission_to_forward',
        'consent_to_rate',
        'details',
        'status',
        'confirmed_at',
        'provider_started_at',
        'provider_done_at',
        'auto_confirm_at',
        'payment_released_at',
        'rating_deadline_at',
        'proof_note',
        'revision_note',
        'dispute_note',
        'client_rating_score',
        'client_rating_note',
        'client_rated_at',
        'provider_rating_score',
        'provider_rating_note',
        'provider_rated_at',
    ];

    protected function casts(): array
    {
        return [
            'permission_to_forward' => 'boolean',
            'consent_to_rate' => 'boolean',
            'job_lat' => 'decimal:7',
            'job_lng' => 'decimal:7',
            'confirmed_at' => 'datetime',
            'provider_started_at' => 'datetime',
            'provider_done_at' => 'datetime',
            'auto_confirm_at' => 'datetime',
            'payment_released_at' => 'datetime',
            'rating_deadline_at' => 'datetime',
            'client_rated_at' => 'datetime',
            'provider_rated_at' => 'datetime',
        ];
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(User::class, 'client_id');
    }

    public function acceptedProvider(): BelongsTo
    {
        return $this->belongsTo(User::class, 'accepted_provider_id');
    }

    public function offers(): HasMany
    {
        return $this->hasMany(Offer::class);
    }

    public function messages(): HasMany
    {
        return $this->hasMany(JobMessage::class);
    }

    public function passes(): HasMany
    {
        return $this->hasMany(RequestPass::class);
    }

    public function notifications(): HasMany
    {
        return $this->hasMany(KailaNotification::class);
    }

    public function isParticipant(User $user): bool
    {
        return $user->isStaff()
            || $this->client_id === $user->id
            || $this->accepted_provider_id === $user->id;
    }
}
