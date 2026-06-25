<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    protected $fillable = [
        'name',
        'first_name',
        'middle_name',
        'last_name',
        'suffix',
        'username',
        'email',
        'password',
        'role',
        'area',
        'category',
        'contact_number',
        'messenger_link',
        'preferred_contact_channel',
        'best_contact_time',
        'auth_provider',
        'auth_subject',
        'social_photo_url',
        'data_privacy_consent',
        'account_status',
    ];

    protected $hidden = ['password', 'remember_token'];

    public function providerProfile(): HasOne
    {
        return $this->hasOne(ProviderProfile::class);
    }

    public function serviceRequests(): HasMany
    {
        return $this->hasMany(ServiceRequest::class, 'client_id');
    }

    public function assignedRequests(): HasMany
    {
        return $this->hasMany(ServiceRequest::class, 'accepted_provider_id');
    }

    public function offers(): HasMany
    {
        return $this->hasMany(Offer::class, 'provider_id');
    }

    public function notifications(): HasMany
    {
        return $this->hasMany(KailaNotification::class);
    }

    public function isStaff(): bool
    {
        return in_array($this->role, ['admin', 'ops', 'customer_service'], true);
    }

    public function isMarketplaceUser(): bool
    {
        return in_array($this->role, ['client', 'provider'], true);
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'data_privacy_consent' => 'boolean',
            'status_updated_at' => 'datetime',
            'banned_at' => 'datetime',
            'deleted_at' => 'datetime',
        ];
    }
}
