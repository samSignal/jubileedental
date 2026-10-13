<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use App\Enums\Permission;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

#[Fillable(['name', 'email', 'password'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

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
            'is_active' => 'boolean',
            'last_login_at' => 'datetime',
            'must_change_password' => 'boolean',
        ];
    }

    public function role(): BelongsTo
    {
        return $this->belongsTo(Role::class);
    }

    /**
     * Deactivated accounts, and accounts without a role, hold no permissions.
     */
    public function hasPermission(Permission $permission): bool
    {
        return $this->is_active && $this->role?->grants($permission) === true;
    }

    /**
     * @return array<int, string>
     */
    public function permissionValues(): array
    {
        return $this->is_active && $this->role ? $this->role->permissionValues() : [];
    }

    /**
     * People who actually see patients: anyone whose role can treat, except that the
     * all-powerful administrator role only counts once they have working hours set
     * (so an owner who also treats patients can opt in, but admins are not listed by default).
     */
    public function scopePractitioners(Builder $query): Builder
    {
        $adminId = Role::where('slug', Role::ADMIN)->value('id');

        return $query->whoCan(Permission::AppointmentsTreat)->where(
            fn (Builder $w) => $w->where('role_id', '!=', $adminId)->orWhereIn(
                'id',
                \Illuminate\Support\Facades\DB::table('dentist_schedules')->select('user_id'),
            ),
        );
    }

    /**
     * Active users whose role holds the permission.
     */
    public function scopeWhoCan(Builder $query, Permission $permission): Builder
    {
        return $query->where('is_active', true)->whereIn('role_id', Role::idsGranting($permission));
    }
}
