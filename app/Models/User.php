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
    public const SUPER_ADMIN_USERNAME = 'jmaeacido';

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

    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    public function isSuperAdmin(): bool
    {
        return $this->isAdmin() && strtolower((string) $this->username) === self::SUPER_ADMIN_USERNAME;
    }

    public function isCustomerService(): bool
    {
        return $this->role === 'customer_service';
    }

    public function isOps(): bool
    {
        return $this->role === 'ops';
    }

    public function canAccessAdminDashboard(): bool
    {
        return $this->isStaff();
    }

    public function canManageAdminAccount(User $target): bool
    {
        if (!$this->isAdmin()) {
            return false;
        }

        if ($target->isSuperAdmin()) {
            return $this->isSuperAdmin() && $target->id === $this->id;
        }

        if ($target->isAdmin()) {
            return $this->isSuperAdmin();
        }

        return true;
    }

    public function canCreateRole(string $role): bool
    {
        if (!$this->isAdmin()) {
            return false;
        }

        return $role === 'admin' ? $this->isSuperAdmin() : in_array($role, ['client', 'provider', 'customer_service', 'ops'], true);
    }

    public function canDeleteAdminAccount(User $target): bool
    {
        return $this->isSuperAdmin() && !$target->isSuperAdmin() && $target->id !== $this->id;
    }

    public function canTriageReports(): bool
    {
        return $this->isAdmin() || $this->isCustomerService();
    }

    public function canResolveDisputes(): bool
    {
        return $this->isCustomerService();
    }

    public function canWriteSupportNotes(): bool
    {
        return $this->isAdmin() || $this->isCustomerService();
    }

    public function canInitiateDirectContact(User $target): bool
    {
        if ($this->id === $target->id) {
            return false;
        }

        if ($this->isAdmin()) {
            return in_array($target->role, ['admin', 'ops', 'customer_service', 'provider', 'client'], true);
        }

        if ($this->isCustomerService()) {
            return in_array($target->role, ['admin', 'customer_service', 'provider', 'client'], true);
        }

        if ($this->isOps()) {
            return $target->isAdmin();
        }

        if ($this->isMarketplaceUser()) {
            return $target->isCustomerService();
        }

        return false;
    }

    public function canReadJobConversation(ServiceRequest $request): bool
    {
        if ($this->isCustomerService()) {
            return $this->supportCanViewRequest($request);
        }

        if ($this->isAdmin()) {
            return $request->accepted_provider_id !== null;
        }

        return $request->isParticipant($this)
            || $request->offers()->where('provider_id', $this->id)->exists();
    }

    public function canWriteJobConversation(ServiceRequest $request): bool
    {
        if ($this->isStaff()) {
            return false;
        }

        return $request->isParticipant($this)
            && in_array($request->status, ['Accepted', 'In Progress', 'Provider Marked Done', 'Revision Requested', 'Disputed'], true);
    }

    public function supportCanViewRequest(ServiceRequest $request): bool
    {
        if ($request->status === 'Disputed') {
            return true;
        }

        return \Illuminate\Support\Facades\DB::table('moderation_reports')
            ->where('service_request_id', $request->id)
            ->whereIn('status', ['Open', 'In Review'])
            ->exists();
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
