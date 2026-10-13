<?php

namespace App\Models;

use App\Enums\Permission;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['slug', 'name', 'description', 'is_system', 'permissions'])]
class Role extends Model
{
    /** The super-user role: always holds every permission and cannot be edited or removed. */
    public const ADMIN = 'admin';

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'permissions' => 'array',
            'is_system' => 'boolean',
        ];
    }

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    public function isSuperAdmin(): bool
    {
        return $this->slug === self::ADMIN;
    }

    /**
     * @return array<int, string>
     */
    public function permissionValues(): array
    {
        if ($this->isSuperAdmin()) {
            return Permission::values();
        }

        // Ignore anything no longer in the catalogue.
        return array_values(array_intersect($this->permissions ?? [], Permission::values()));
    }

    public function grants(Permission|string $permission): bool
    {
        $value = $permission instanceof Permission ? $permission->value : $permission;

        return in_array($value, $this->permissionValues(), true);
    }

    /**
     * IDs of every role that holds the permission.
     *
     * @return array<int, int>
     */
    public static function idsGranting(Permission $permission): array
    {
        return static::query()->get()
            ->filter(fn (self $role) => $role->grants($permission))
            ->pluck('id')
            ->all();
    }
}
