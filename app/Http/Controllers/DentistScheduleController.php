<?php

namespace App\Http\Controllers;

use App\Enums\Permission;
use App\Models\DentistSchedule;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Weekly working hours per dentist. Reachable only with `schedules.manage`.
 */
class DentistScheduleController extends Controller
{
    public function index(): Response
    {
        $dentists = User::query()->whoCan(Permission::AppointmentsTreat)->orderBy('name')->get(['id', 'name']);
        $blocks = DentistSchedule::query()->whereIn('user_id', $dentists->pluck('id'))->orderBy('start_time')->get()->groupBy('user_id');

        return Inertia::render('Schedules/Index', [
            'dentists' => $dentists->map(fn (User $d) => [
                'id' => $d->id,
                'name' => $d->name,
                'blocks' => ($blocks[$d->id] ?? collect())->map(fn (DentistSchedule $b) => [
                    'weekday' => $b->weekday,
                    'start' => substr($b->start_time, 0, 5),
                    'end' => substr($b->end_time, 0, 5),
                ])->values()->all(),
            ])->all(),
        ]);
    }

    public function update(Request $request, User $user): RedirectResponse
    {
        abort_unless($user->hasPermission(Permission::AppointmentsTreat), 404);

        $data = $request->validate([
            'blocks' => ['present', 'array', 'max:28'],
            'blocks.*.weekday' => ['required', 'integer', 'between:0,6'],
            'blocks.*.start' => ['required', 'date_format:H:i'],
            'blocks.*.end' => ['required', 'date_format:H:i'],
        ]);

        $byDay = collect($data['blocks'])->groupBy('weekday');

        foreach ($byDay as $weekday => $day) {
            $sorted = $day->sortBy('start')->values();

            foreach ($sorted as $i => $block) {
                if ($block['end'] <= $block['start']) {
                    throw ValidationException::withMessages(['blocks' => 'Each block must finish after it starts.']);
                }

                if ($i > 0 && $block['start'] < $sorted[$i - 1]['end']) {
                    throw ValidationException::withMessages(['blocks' => 'Working blocks on the same day cannot overlap.']);
                }
            }
        }

        DB::transaction(function () use ($user, $data) {
            DentistSchedule::where('user_id', $user->id)->delete();

            foreach ($data['blocks'] as $block) {
                DentistSchedule::create([
                    'user_id' => $user->id,
                    'weekday' => $block['weekday'],
                    'start_time' => $block['start'],
                    'end_time' => $block['end'],
                ]);
            }
        });

        return back()->with('message', "{$user->name}'s working hours were saved.");
    }
}
