<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProviderProfile extends Model
{
    protected $fillable = [
        'user_id',
        'display_name',
        'provider_type',
        'category',
        'specific_services',
        'area',
        'coverage_area',
        'availability',
        'emergency_availability',
        'years_experience',
        'skills',
        'minimum_fee',
        'price_range',
        'rules_agreement',
        'trust_level',
        'status',
    ];

    protected function casts(): array
    {
        return ['rules_agreement' => 'boolean'];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
