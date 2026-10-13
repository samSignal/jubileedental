<?php

namespace App\Http\Controllers;

use App\Enums\Permission;
use App\Http\Requests\StoreRoleRequest;
use App\Http\Requests\UpdateRoleRequest;
use App\Models\Role;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Create roles and choose which permissions each one holds.
 * Reachable only with the `roles.manage` permission.
 */
class RoleController extends Controller
{
    public function index(Request $request): Response
    {
        $roles = Role::query()->withCount('users')->orderByDesc('is_system')->orderBy('name')->get();

        return Inertia::render('Roles/Index', [
            'roles' => $roles->map(fn (Role $r) => [
                'id' => $r->id,
                'slug' => $r->slug,
                'name' => $r->name,
                'description' => $r->description,
                'is_system' => $r->is_system,
                'is_locked' => $r->isSuperAdmin(),
                'is_own' => $r->is($request->user()->role),
                'users_count' => $r->users_count,
                'permissions' => $r->permissionValues(),
            ])->all(),
            'catalogue' => collect(Permission::cases())
                ->groupBy(fn (Permission $p) => $p->group())
                ->map(fn ($items, string $group) => [
                    'group' => $group,
                    'items' => $items->map(fn (Permission $p) => [
                        'value' => $p->value,
                        'label' => $p->label(),
                    ])->values()->all(),
                ])
                ->values()
                ->all(),
            'selectedId' => $request->integer('role') ?: null,
        ]);
    }

    public function store(StoreRoleRequest $request): RedirectResponse
    {
        $role = Role::create([
            'slug' => $this->uniqueSlug($request->validated('name')),
            'name' => $request->validated('name'),
            'description' => $request->validated('description'),
            'is_system' => false,
            'permissions' => array_values(array_unique($request->validated('permissions') ?? [])),
        ]);

        return redirect()->route('roles.index', ['role' => $role->id])
            ->with('message', "The {$role->name} role was created.");
    }

    public function update(UpdateRoleRequest $request, Role $role): RedirectResponse
    {
        if ($role->isSuperAdmin()) {
            throw ValidationException::withMessages([
                'name' => 'The System Administrator role always has full access and cannot be changed.',
            ]);
        }

        $permissions = array_values(array_unique($request->validated('permissions') ?? []));

        // Do not let someone strip the access they are using to make this very change.
        if ($role->is($request->user()->role)) {
            $needed = [Permission::RolesManage->value, Permission::UsersManage->value];
            $kept = array_intersect($needed, $request->user()->role->permissionValues());

            if (array_diff($kept, $permissions) !== []) {
                throw ValidationException::withMessages([
                    'permissions' => 'You cannot remove your own access to manage roles or users.',
                ]);
            }
        }

        $role->update([
            'name' => $request->validated('name'),
            'description' => $request->validated('description'),
            'permissions' => $permissions,
        ]);

        return back()->with('message', "The {$role->name} role was updated.");
    }

    public function destroy(Role $role): RedirectResponse
    {
        if ($role->is_system) {
            throw ValidationException::withMessages(['role' => 'Built-in roles cannot be deleted.']);
        }

        if ($role->users()->exists()) {
            throw ValidationException::withMessages([
                'role' => 'Move the people in this role to another role before deleting it.',
            ]);
        }

        $role->delete();

        return redirect()->route('roles.index')->with('message', "The {$role->name} role was deleted.");
    }

    private function uniqueSlug(string $name): string
    {
        $base = Str::slug($name, '_') ?: 'role';
        $slug = $base;
        $i = 2;

        while (Role::where('slug', $slug)->exists()) {
            $slug = "{$base}_{$i}";
            $i++;
        }

        return $slug;
    }
}
