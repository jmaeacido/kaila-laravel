<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class JobMessage extends Model
{
    protected $fillable = [
        'service_request_id',
        'sender_id',
        'body',
        'kind',
        'call_metadata',
    ];

    protected function casts(): array
    {
        return ['call_metadata' => 'array'];
    }

    public function serviceRequest(): BelongsTo
    {
        return $this->belongsTo(ServiceRequest::class);
    }

    public function sender(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sender_id');
    }
}
