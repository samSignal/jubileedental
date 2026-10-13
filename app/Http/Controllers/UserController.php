<?php

namespace App\Http\Controllers;

use App\Enums\Permission;
use App\Http\Requests\ResetUserPasswordRequest;
use App\Http\Requests\StoreUserRequest;
use App\Http\Requests\UpdateUserRequest;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Staff account management. Reachable only with the `users.manage` permission.
 */
class UserController extends Controller
{
    public function index(Request $request): Response
    {
        return Inertia::render('Users/Index', [
            'users' => User::query()->with('role:id,name,slug')->orderBy('name')->get()->map(fn (User $u) => [
                'id' => $u->id,
                'name' => $u->name,
                'username' => $u->username,
                'email' => $u->email,
                'role_id' => $u->role_id,
                'role_name' => $u->role?->name ?? 'No role',
                'is_active' => $u->is_active,
                'is_self' => $u->is($request->user()),
                'must_change_password' => $u->must_change_password,
                'last_login_at' => $u->last_login_at?->toIso8601String(),
                'last_login_ip' => $u->last_login_ip,
            ])->all(),
            'roles' => Role::query()->orderByDesc('is_system')->orderBy('name')->get()
                ->map(fn (Role $r) => [
                    'id' => $r->id,
                    'name' => $r->name,
                    'description' => $r->description,
                ])->all(),
        ]);
    }

    public function store(StoreUserRequest $request): RedirectResponse
    {
        $user = new User;
        $user->forceFill([
            'name' => $request->validated('name'),
            'username' => $request->validated('username'),
            'email' => $request->validated('email'),
            'role_id' => $request->validated('role_id'),
            'password' => $request->validated('password'),
            'is_active' => true,
            'must_change_password' => true,
            'email_verified_at' => now(),
        ])->save();

        return back()->with('message', "{$user->name} can now sign in as {$user->username}.");
    }

    public function update(UpdateUserRequest $request, User $user): RedirectResponse
    {
        $role = Role::findOrFail($request->validated('role_id'));
        $active = (bool) $request->validated('is_active');

        if ($user->is($request->user()) && ($role->id !== $user->role_id || ! $active)) {
            throw ValidationException::withMessages([
                'role_id' => 'You cannot change your own role or deactivate your own account.',
            ]);
        }

        // Someone must always be able to manage accounts.
        $losesManagement = $user->hasPermission(Permission::UsersManage)
            && (! $role->grants(Permission::UsersManage) || ! $active);

        if ($losesManagement && User::whoCan(Permission::UsersManage)->count() <= 1) {
            throw ValidationException::withMessages([
                'role_id' => 'There must always be at least one active person who can manage accounts.',
            ]);
        }

        $user->forceFill([
            'name' => $request->validated('name'),
            'email' => $request->validated('email'),
            'role_id' => $role->id,
            'is_active' => $active,
        ])->save();

        if (! $active) {
            $this->endSessions($user);
        }

        return back()->with('message', "{$user->name} was updated.");
    }

    public function resetPassword(ResetUserPasswordRequest $request, User $user): RedirectResponse
    {
        $user->forceFill([
            'password' => $request->validated('password'),
            'must_change_password' => true,
            'remember_token' => null,
        ])->save();

        $this->endSessions($user);

        return back()->with('message', "{$user->name} must choose a new password at next sign-in.");
    }

    /**
     * Force an immediate sign-out everywhere (database session driver).
     */
    private function endSessions(User $user): void
    {
        if (config('session.driver') === 'database') {
            DB::table(config('session.table', 'sessions'))->where('user_id', $user->id)->delete();
        }
    }
}
