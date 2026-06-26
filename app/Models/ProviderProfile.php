<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProviderProfile extends Model
{
    protected $fillable = [
        'user_id',
        'display_name',
        'tagline',
        'provider_type',
        'category',
        'specific_services',
        'about',
        'area',
        'coverage_area',
        'availability',
        'emergency_availability',
        'response_time',
        'years_experience',
        'skills',
        'minimum_fee',
        'price_range',
        'travel_limit',
        'work_samples',
        'certificates',
        'rules_agreement',
        'trust_level',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'rules_agreement' => 'boolean',
            'work_samples' => 'array',
            'certificates' => 'array',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
