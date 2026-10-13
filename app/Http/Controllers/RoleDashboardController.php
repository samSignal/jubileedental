<?php

namespace App\Http\Controllers;

use App\Services\DashboardData;
use App\Enums\Permission;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class RoleDashboardController extends Controller
{
    private const RANGES = [7, 30, 90];

    public function __invoke(Request $request): Response|RedirectResponse
    {
        $user = $request->user();
        $data = new DashboardData($user);

        // Front-desk staff work from one screen, so that is their home page.
        if ($data->view() === 'frontdesk' && $user->hasPermission(Permission::AppointmentsQueue)) {
            return redirect()->route('frontdesk.index');
        }

        $range = (int) $request->integer('range', 7);
        $range = in_array($range, self::RANGES, true) ? $range : 7;

        // Closures keep partial reloads (live polling) cheap: only requested props run.
        return Inertia::render('Dashboard', [
            'role' => $user->role?->slug,
            'roleLabel' => $user->role?->name ?? 'Staff',
            'view' => $data->view(),
            'range' => $range,
            'can' => $data->permissions(),
            'hasDemoRecords' => fn () => $data->hasDemoRecords(),
            'stats' => fn () => $data->stats(),
            'queue' => fn () => $data->queue(),
            'timeline' => fn () => $data->timeline(),
            'series' => fn () => $data->series($range),
            'recentPatients' => fn () => $data->recentPatients(),
            'followUps' => fn () => $data->followUps(),
            'activity' => fn () => $data->activity(),
            'outstanding' => fn () => $data->outstanding(),
            'options' => fn () => $data->options(),
        ]);
    }
}
