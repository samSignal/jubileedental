<?php

namespace App\Http\Controllers;

use App\Enums\AppointmentStatus;
use App\Enums\Permission;
use App\Http\Requests\RescheduleAppointmentRequest;
use App\Http\Requests\StoreAppointmentRequest;
use App\Http\Requests\UpdateAppointmentStatusRequest;
use App\Http\Requests\WalkInRequest;
use App\Models\Appointment;
use App\Models\Patient;
use App\Models\User;
use App\Services\DashboardData;
use App\Services\QueueService;
use App\Services\Scheduling;
use App\Support\Presenter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;

class AppointmentController extends Controller
{
    public function __construct(
        private readonly QueueService $queue,
        private readonly Scheduling $scheduling,
    ) {}

    /**
     * Day view: every dentist's working hours and bookings for one date.
     */
    public function index(Request $request): Response
    {
        $day = Carbon::parse($request->query('date', now()->toDateString()))->startOfDay();
        $user = $request->user();
        $showAlerts = $user->hasPermission(Permission::ClinicalView);

        $dentists = User::query()->practitioners()->orderBy('name')->get(['id', 'name']);

        $appointments = Appointment::query()
            ->whereBetween('scheduled_at', [$day, $day->copy()->endOfDay()])
            ->with(['patient.medicalHistory', 'patient.consents', 'dentist:id,name'])
            ->orderBy('scheduled_at')
            ->limit(200)
            ->get();

        return Inertia::render('Appointments/Index', [
            'date' => $day->toDateString(),
            'is_today' => $day->isToday(),
            'is_past' => $day->lt(now()->startOfDay()),
            'dentists' => $dentists->map(fn (User $d) => [
                'id' => $d->id,
                'name' => $d->name,
                'configured' => $this->scheduling->hasSchedule($d),
                'hours' => $this->scheduling->blocksFor($d, $day)->map(fn (array $b) => [
                    'start' => $b['start']->format('H:i'),
                    'end' => $b['end']->format('H:i'),
                    'label' => $b['start']->format('h:i A').' – '.$b['end']->format('h:i A'),
                ])->values()->all(),
            ])->all(),
            'appointments' => $appointments->map(fn (Appointment $a) => [
                ...Presenter::appointment($a, $showAlerts, true),
                'date' => $a->scheduled_at->toDateString(),
                'clock' => $a->scheduled_at->format('H:i'),
            ])->all(),
            'options' => [
                'patients' => Patient::query()->orderBy('name')->limit(500)->get(['id', 'name', 'phone'])->all(),
            ],
            'can' => [
                'book' => $user->hasPermission(Permission::AppointmentsBook),
                'queue' => $user->hasPermission(Permission::AppointmentsQueue),
                'treat' => $user->hasPermission(Permission::AppointmentsTreat),
            ],
        ]);
    }

    /**
     * Free start times for a dentist on a day.
     */
    public function availability(Request $request): JsonResponse
    {
        $data = $request->validate([
            'dentist_id' => ['required', 'integer', 'exists:users,id'],
            'date' => ['required', 'date'],
            'duration' => ['nullable', 'integer', 'min:10', 'max:480'],
            'ignore' => ['nullable', 'integer'],
        ]);

        $dentist = User::findOrFail($data['dentist_id']);
        $day = Carbon::parse($data['date'])->startOfDay();

        return response()->json([
            'configured' => $this->scheduling->hasSchedule($dentist),
            'slots' => $this->scheduling->freeSlots($dentist, $day, (int) ($data['duration'] ?? 30)),
        ]);
    }

    public function store(StoreAppointmentRequest $request): JsonResponse|RedirectResponse
    {
        $appointment = Appointment::create([
            ...$request->validated(),
            'status' => AppointmentStatus::Scheduled,
        ]);

        if ($request->wantsJson()) {
            return response()->json(['appointment' => Presenter::appointment($appointment)], 201);
        }

        return back()->with('message', 'Appointment booked for '.$appointment->scheduled_at->format('M j, h:i A').'.');
    }

    /**
     * A patient who has just walked in: an appointment for right now.
     */
    public function walkIn(WalkInRequest $request): JsonResponse|RedirectResponse
    {
        $appointment = Appointment::create([
            'patient_id' => $request->validated('patient_id'),
            'dentist_id' => $request->validated('dentist_id'),
            'procedure' => $request->validated('procedure'),
            'scheduled_at' => now()->startOfMinute(),
            'duration_minutes' => 30,
            'status' => AppointmentStatus::Scheduled,
            'is_walk_in' => true,
        ]);

        // One action for a walk-in: straight into today's queue.
        if ($request->boolean('check_in')) {
            $appointment = $this->queue->checkIn($appointment, $request->user(), $request->validated('consent'));
        }

        if ($request->wantsJson()) {
            return response()->json(['appointment' => Presenter::appointment($appointment)], 201);
        }

        return back()->with('message', $appointment->queue_number
            ? "Walk-in added to the queue as {$appointment->queueLabel()}."
            : 'Walk-in registered.');
    }

    public function reschedule(RescheduleAppointmentRequest $request, Appointment $appointment): JsonResponse|RedirectResponse
    {
        $appointment->forceFill([
            'scheduled_at' => Carbon::parse($request->validated('scheduled_at')),
            'dentist_id' => $request->has('dentist_id') ? $request->validated('dentist_id') : $appointment->dentist_id,
            'duration_minutes' => $request->validated('duration_minutes') ?? $appointment->duration_minutes,
            'reschedule_count' => $appointment->reschedule_count + 1,
        ])->save();

        if ($request->wantsJson()) {
            return response()->json(['appointment' => Presenter::appointment($appointment->fresh())]);
        }

        return back()->with('message', 'Appointment moved to '.$appointment->scheduled_at->format('M j, h:i A').'.');
    }

    public function updateStatus(UpdateAppointmentStatusRequest $request, Appointment $appointment): RedirectResponse
    {
        $to = AppointmentStatus::from($request->validated('status'));

        abort_unless(DashboardData::roleMayMove($request->user()->role, $to), 403);

        if (! $appointment->status->canMoveTo($to)) {
            return back()->withErrors(['status' => "That appointment is already {$appointment->status->label()}."]);
        }

        // Arrival goes through the queue service: intake check, ticket number, notification.
        if ($to === AppointmentStatus::Waiting) {
            $appointment = $this->queue->checkIn($appointment, $request->user());

            return back()->with('message', "{$appointment->patient->name} is in the queue as {$appointment->queueLabel()}.");
        }

        $timestamps = match ($to) {
            AppointmentStatus::InProgress => ['started_at' => now()],
            AppointmentStatus::Completed => ['completed_at' => now()],
            default => [],
        };

        $appointment->update(['status' => $to, ...$timestamps]);

        return back()->with('message', "{$appointment->patient->name}: {$to->label()}.");
    }

    /**
     * One-click check-in: ticket number, arrival time, dentist notified. If consent
     * is due it can be recorded in the same request.
     */
    public function checkIn(Request $request, Appointment $appointment): JsonResponse|RedirectResponse
    {
        $data = $request->validate([
            'consent' => ['nullable', 'array'],
            'consent.signed_by_name' => ['required_with:consent', 'string', 'max:120'],
            'consent.relationship' => ['required_with:consent', 'in:self,parent,guardian'],
        ]);

        $appointment = $this->queue->checkIn($appointment, $request->user(), $data['consent'] ?? null);

        $notified = $appointment->dentist
            ? [$appointment->dentist->name]
            : User::query()->practitioners()->pluck('name')->all();

        if ($request->wantsJson()) {
            return response()->json([
                'appointment' => Presenter::appointment($appointment, false, true),
                'notified' => $notified,
            ]);
        }

        return back()->with('message', "{$appointment->patient->name} is in the queue as {$appointment->queueLabel()}.");
    }

    /**
     * Nudge the dentist again about a patient who is still waiting.
     */
    public function notify(Request $request, Appointment $appointment): JsonResponse|RedirectResponse
    {
        abort_unless($appointment->status === AppointmentStatus::Waiting, 422, 'Only waiting patients can be announced.');

        $recipients = $this->queue->notifyDentist($appointment->loadMissing(['patient.medicalHistory', 'dentist']));

        if ($request->wantsJson()) {
            return response()->json(['notified' => $recipients->pluck('name')->all()]);
        }

        return back()->with('message', 'Notified '.$recipients->pluck('name')->implode(', ').'.');
    }
}
