<?php

namespace App\Providers;

use App\Enums\Permission;
use App\Models\User;
use Illuminate\Auth\Events\Login;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Vite::prefetch(concurrency: 3);

        // RBAC: every permission is a Gate ability, so routes use `can:patients.create`
        // and code uses `$user->can('patients.create')` / `Gate::allows(...)`.
        foreach (Permission::cases() as $permission) {
            Gate::define($permission->value, fn (User $user) => $user->hasPermission($permission));
        }

        // Strong passwords for staff accounts (relaxed only for the automated test run).
        Password::defaults(fn () => $this->app->runningUnitTests()
            ? Password::min(8)
            : Password::min(10)->mixedCase()->numbers());

        // Remember when and from where each person last signed in.
        Event::listen(Login::class, function (Login $event): void {
            if ($event->user instanceof User) {
                $event->user->forceFill([
                    'last_login_at' => now(),
                    'last_login_ip' => request()->ip(),
                ])->saveQuietly();
            }
        });
    }
}
