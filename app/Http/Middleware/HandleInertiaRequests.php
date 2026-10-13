<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that is loaded on the first page visit.
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determine the current asset version.
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'notifications' => fn () => ($user = $request->user()) ? [
                'unread' => $user->unreadNotifications()->count(),
                'items' => $user->notifications()->latest()->limit(8)->get()->map(fn ($n) => [
                    'id' => $n->id,
                    'title' => $n->data['title'] ?? 'Notification',
                    'body' => $n->data['body'] ?? '',
                    'patient_id' => $n->data['patient_id'] ?? null,
                    'appointment_id' => $n->data['appointment_id'] ?? null,
                    'queue_number' => $n->data['queue_number'] ?? null,
                    'alerts' => $n->data['alerts'] ?? [],
                    'intake_overridden' => $n->data['intake_overridden'] ?? false,
                    'read' => $n->read_at !== null,
                    'at' => $n->created_at->toIso8601String(),
                ])->all(),
            ] : null,
            'flash' => [
                'message' => fn () => $request->session()->get('message'),
            ],
            'auth' => [
                'user' => $request->user() ? [
                    ...$request->user()->only(['id', 'name', 'email', 'username']),
                    'role' => $request->user()->role?->slug,
                    'role_label' => $request->user()->role?->name,
                    'permissions' => $request->user()->permissionValues(),
                    'must_change_password' => (bool) $request->user()->must_change_password,
                ] : null,
            ],
        ];
    }
}
