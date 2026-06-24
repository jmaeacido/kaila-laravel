<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Offer extends Model
{
    protected $fillable = [
        'service_request_id',
        'provider_id',
        'type',
        'amount',
        'schedule',
        'notes',
        'provider_lat',
        'provider_lng',
        'provider_location_captured_at',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'provider_lat' => 'decimal:7',
            'provider_lng' => 'decimal:7',
            'provider_location_captured_at' => 'datetime',
        ];
    }

    public function serviceRequest(): BelongsTo
    {
        return $this->belongsTo(ServiceRequest::class);
    }

    public function provider(): BelongsTo
    {
        return $this->belongsTo(User::class, 'provider_id');
    }
}
