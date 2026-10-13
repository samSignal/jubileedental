<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * New and reset accounts carry a temporary password chosen by an administrator.
 * Until the person sets their own, the only places they can go are the profile
 * (to change it) and log out.
 */
class EnsurePasswordIsChanged
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (
            $user?->must_change_password
            && ! $request->routeIs('profile.edit', 'password.update', 'logout')
        ) {
            return redirect()->route('profile.edit');
        }

        return $next($request);
    }
}
