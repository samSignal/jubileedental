<?php

namespace App\Services;

use App\Enums\AppointmentStatus;
use App\Enums\InvoiceStatus;
use App\Enums\Permission;
use App\Models\Appointment;
use App\Models\Invoice;
use App\Models\Patient;
use App\Models\Payment;
use App\Models\Prescription;
use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

/**
 * Builds every figure shown on a user's dashboard straight from the database.
 *
 * Two rules:
 *  - Nothing is invented: with no records, counters are zero and lists are empty.
 *  - Nothing is sent that the viewer's permissions do not allow. Hiding a card in
 *    the browser is not security, so withheld data never leaves the server.
 */
class DashboardData
{
    public function __construct(private readonly User $user) {}

    private function can(Permission $permission): bool
    {
        return $this->user->hasPermission($permission);
    }

    /**
     * Which dashboard layout suits this user's permissions.
     *
     * clinician: treats patients, does not run the front desk (e.g. a dentist)
     * frontdesk: runs the queue / takes payments (e.g. a receptionist)
     * admin:     manages the system, or anything else (general overview)
     */
    public function view(): string
    {
        if ($this->can(Permission::UsersManage)) {
            return 'admin';
        }

        if ($this->can(Permission::AppointmentsTreat) && ! $this->can(Permission::AppointmentsQueue)) {
            return 'clinician';
        }

        if ($this->can(Permission::AppointmentsQueue) || $this->can(Permission::PaymentsRecord) || $this->can(Permission::FinanceView)) {
            return 'frontdesk';
        }

        return 'admin';
    }

    private function isClinician(): bool
    {
        return $this->view() === 'clinician';
    }

    /**
     * Feature flags used by the UI to show only the actions this user may perform.
     *
     * @return array<string, bool>
     */
    public function permissions(): array
    {
        return [
            'createPatient' => $this->can(Permission::PatientsCreate),
            'bookAppointment' => $this->can(Permission::AppointmentsBook),
            'addInvoice' => $this->can(Permission::InvoicesCreate),
            'recordPayment' => $this->can(Permission::PaymentsRecord),
            'prescribe' => $this->can(Permission::PrescriptionsCreate),
            'seesRevenue' => $this->can(Permission::FinanceView),
            'manageUsers' => $this->can(Permission::UsersManage),
        ];
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function stats(): array
    {
        return match ($this->view()) {
            'clinician' => $this->clinicianStats(),
            'frontdesk' => $this->frontDeskStats(),
            default => $this->overviewStats(),
        };
    }

    /**
     * @return array{waiting: int, in_treatment: int, overdue: int, next: array<string, string>|null, longest_wait: int|null}
     */
    public function queue(): array
    {
        if (! $this->can(Permission::AppointmentsView)) {
            return ['waiting' => 0, 'in_treatment' => 0, 'overdue' => 0, 'next' => null, 'longest_wait' => null];
        }

        $today = $this->scoped()->whereBetween('scheduled_at', $this->dayBounds(0))->with('patient:id,name')->get();

        $waiting = $today->where('status', AppointmentStatus::Waiting);
        $next = $today->where('status', AppointmentStatus::Scheduled)->sortBy('scheduled_at')->first();

        return [
            'waiting' => $waiting->count(),
            'in_treatment' => $today->where('status', AppointmentStatus::InProgress)->count(),
            'overdue' => $today->filter(fn (Appointment $a) => $this->isOverdue($a))->count(),
            'next' => $next ? [
                'patient' => $next->patient->name,
                'time' => $next->scheduled_at->format('h:i A'),
            ] : null,
            'longest_wait' => $waiting->isEmpty()
                ? null
                : (int) $waiting->max(fn (Appointment $a) => $a->checked_in_at?->diffInMinutes(now()) ?? 0),
        ];
    }

    /**
     * Today's appointments in time order.
     *
     * @return array<int, array<string, mixed>>
     */
    public function timeline(): array
    {
        if (! $this->can(Permission::AppointmentsView)) {
            return [];
        }

        return $this->scoped()
            ->whereBetween('scheduled_at', $this->dayBounds(0))
            ->with(['patient.medicalHistory', 'patient.consents', 'dentist:id,name'])
            ->orderBy('scheduled_at')
            ->limit(40)
            ->get()
            ->map(fn (Appointment $a) => [
                'id' => $a->id,
                'patient_id' => $a->patient_id,
                'patient' => $a->patient->name,
                'procedure' => $a->procedure,
                'dentist' => $a->dentist?->name,
                'time' => $a->scheduled_at->format('h:i A'),
                'scheduled_at' => $a->scheduled_at->toIso8601String(),
                'duration_minutes' => $a->duration_minutes,
                'queue_number' => $a->queue_number,
                'queue_label' => $a->queueLabel(),
                'is_walk_in' => $a->is_walk_in,
                'intake_overridden' => $a->intake_overridden,
                'intake_missing' => $a->status === AppointmentStatus::Scheduled && $this->can(Permission::AppointmentsQueue)
                    ? count(\App\Services\PatientIntake::missing($a->patient))
                    : 0,
                // Allergies and conditions are clinical data: clinical roles only.
                'alerts' => $this->can(Permission::ClinicalView) ? $a->patient->alerts() : [],
                'history_status' => $this->can(Permission::ClinicalView)
                    ? \App\Services\PatientIntake::historyStatus($a->patient)
                    : 'ok',
                'consent_pending' => $a->status !== AppointmentStatus::Completed
                    && \App\Services\PatientIntake::consentPending($a->patient),
                'status' => $a->status->value,
                'status_label' => $a->status->label(),
                'is_overdue' => $this->isOverdue($a),
                'late_minutes' => $this->isOverdue($a) ? (int) $a->scheduled_at->diffInMinutes(now()) : 0,
                'waiting_minutes' => $a->status === AppointmentStatus::Waiting && $a->checked_in_at
                    ? (int) $a->checked_in_at->diffInMinutes(now())
                    : null,
                'actions' => $this->actionsFor($a),
            ])
            ->values()
            ->all();
    }

    /**
     * Daily series for the chart: payments for people who may see finances,
     * patients seen for everyone else.
     *
     * @return array<string, mixed>
     */
    public function series(int $days): array
    {
        $patientsMetric = ! $this->can(Permission::FinanceView);
        $current = $patientsMetric ? $this->seenPerDay($days, 0) : $this->paymentsPerDay($days, 0);
        $previous = $patientsMetric ? $this->seenPerDay($days, $days) : $this->paymentsPerDay($days, $days);

        return [
            'range' => $days,
            'metric' => $patientsMetric ? 'patients' : 'revenue',
            'title' => $patientsMetric ? 'Patients Seen' : 'Revenue Overview',
            'points' => $current->map(fn (float|int $value, string $date) => [
                'date' => $date,
                'label' => Carbon::parse($date)->format('M j'),
                'value' => $value,
            ])->values()->all(),
            'total' => round($current->sum(), 2),
            'previous_total' => round($previous->sum(), 2),
        ];
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function recentPatients(): array
    {
        if (! $this->can(Permission::PatientsView)) {
            return [];
        }

        return Patient::query()
            ->withMax(['appointments as last_visit' => fn (Builder $q) => $q->where('status', AppointmentStatus::Completed->value)], 'scheduled_at')
            ->withMin(['appointments as next_visit' => fn (Builder $q) => $q
                ->whereIn('status', [AppointmentStatus::Scheduled->value, AppointmentStatus::Waiting->value])
                ->where('scheduled_at', '>=', now()->startOfDay())], 'scheduled_at')
            ->orderByRaw('COALESCE(last_visit, patients.created_at) DESC')
            ->limit(6)
            ->get()
            ->map(fn (Patient $p) => [
                'id' => $p->id,
                'name' => $p->name,
                'phone' => $p->phone,
                'last_visit' => $p->last_visit ? Carbon::parse($p->last_visit)->format('M j, Y') : null,
                'next_visit' => $p->next_visit ? Carbon::parse($p->next_visit)->format('M j, h:i A') : null,
            ])
            ->all();
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function followUps(): array
    {
        if (! $this->can(Permission::AppointmentsView)) {
            return [];
        }

        return $this->scoped()
            ->where('status', AppointmentStatus::Scheduled->value)
            ->where('scheduled_at', '>', now()->endOfDay())
            ->with('patient:id,name')
            ->orderBy('scheduled_at')
            ->limit(6)
            ->get()
            ->map(fn (Appointment $a) => [
                'id' => $a->id,
                'patient' => $a->patient->name,
                'procedure' => $a->procedure,
                'date' => $a->scheduled_at->format('M j, Y'),
            ])
            ->all();
    }

    /**
     * Most recent real events the viewer is allowed to know about, newest first.
     *
     * @return array<int, array<string, mixed>>
     */
    public function activity(): array
    {
        $feed = Collection::make();

        if ($this->can(Permission::FinanceView)) {
            $feed = $feed->concat(
                Payment::query()->with('patient:id,name')->latest('paid_at')->limit(8)->get()
                    ->map(fn (Payment $p) => [
                        'key' => 'payment-'.$p->id,
                        'type' => 'payment',
                        'title' => 'Payment received - $'.number_format((float) $p->amount, 2),
                        'meta' => $p->patient->name,
                        'tone' => 'green',
                        'icon' => 'card',
                        'at' => $p->paid_at,
                    ]),
            );
        }

        if ($this->can(Permission::AppointmentsView)) {
            $feed = $feed->concat(
                Appointment::query()->with('patient:id,name')->latest('created_at')->limit(8)->get()
                    ->map(fn (Appointment $a) => [
                        'key' => 'appointment-'.$a->id,
                        'type' => 'appointment',
                        'title' => 'New appointment booked',
                        'meta' => $a->patient->name.' · '.$a->procedure,
                        'tone' => 'violet',
                        'icon' => 'calendar',
                        'at' => $a->created_at,
                    ]),
            );
        }

        if ($this->can(Permission::PatientsView)) {
            $feed = $feed->concat(
                Patient::query()->latest('created_at')->limit(8)->get()
                    ->map(fn (Patient $p) => [
                        'key' => 'patient-'.$p->id,
                        'type' => 'patient',
                        'title' => 'New patient registered',
                        'meta' => $p->name,
                        'tone' => 'blue',
                        'icon' => 'patients',
                        'at' => $p->created_at,
                    ]),
            );
        }

        if ($this->can(Permission::ClinicalView) || $this->can(Permission::PrescriptionsCreate)) {
            $feed = $feed->concat(
                Prescription::query()->with('patient:id,name')->latest('issued_at')->limit(8)->get()
                    ->map(fn (Prescription $p) => [
                        'key' => 'prescription-'.$p->id,
                        'type' => 'prescription',
                        'title' => 'Prescription created',
                        'meta' => $p->patient->name.' · '.$p->medication,
                        'tone' => 'rose',
                        'icon' => 'file',
                        'at' => $p->issued_at,
                    ]),
            );
        }

        return $feed
            ->sortByDesc('at')
            ->take(8)
            ->map(fn (array $item) => [...$item, 'at' => $item['at']->toIso8601String()])
            ->values()
            ->all();
    }

    /**
     * Unsettled invoices with their remaining balance, oldest first.
     * Empty for anyone without access to finances.
     *
     * @return array{count: int, total: float, invoices: array<int, array<string, mixed>>}
     */
    public function outstanding(): array
    {
        if (! $this->can(Permission::FinanceView)) {
            return ['count' => 0, 'total' => 0.0, 'invoices' => []];
        }

        $invoices = $this->openInvoices();

        return [
            'count' => $invoices->count(),
            'total' => round($invoices->sum('balance'), 2),
            'invoices' => $invoices->take(100)->values()->all(),
        ];
    }

    /**
     * Select-box data for the quick-action forms.
     *
     * @return array<string, array<int, mixed>>
     */
    public function options(): array
    {
        return [
            'patients' => $this->can(Permission::PatientsView)
                ? Patient::query()->orderBy('name')->limit(500)->get(['id', 'name', 'phone'])->all()
                : [],
            'services' => \App\Models\Service::active()->orderBy('name')->get(['id', 'name', 'price'])
                ->map(fn ($s) => ['id' => $s->id, 'name' => $s->name, 'price' => (float) $s->price])->all(),
            // Anyone whose role can treat patients may be assigned appointments.
            'dentists' => User::query()->practitioners()
                ->orderBy('name')->get(['id', 'name'])->all(),
        ];
    }

    public function hasDemoRecords(): bool
    {
        return Patient::query()->where('is_demo', true)->exists();
    }

    /* ---------------------------------------------------------------- */

    /**
     * Admin / general overview. Money figures appear only with finance access.
     *
     * @return array<int, array<string, mixed>>
     */
    private function overviewStats(): array
    {
        $startOfMonth = now()->startOfMonth();
        $newThis = Patient::where('created_at', '>=', $startOfMonth)->count();
        $newLast = Patient::whereBetween('created_at', [$startOfMonth->copy()->subMonth(), $startOfMonth])->count();

        $stats = [
            $this->stat('patients', 'Total Patients', Patient::count(), 'number', 'blue', 'patients',
                trend: $this->trend($newThis, $newLast, 'new vs last month')),
            $this->stat('appointments', "Today's Appointments", $this->scheduleCount(0), 'number', 'green', 'calendar',
                trend: $this->trend($this->scheduleCount(0), $this->scheduleCount(-1), 'vs. yesterday'),
                spark: $this->appointmentsPerDay(7)->values()->all()),
        ];

        if ($this->can(Permission::FinanceView)) {
            $today = $this->paymentsOn(0);

            return [
                ...$stats,
                $this->stat('revenue', 'Revenue Today', $today, 'money', 'rose', 'invoice',
                    trend: $this->trend($today, $this->paymentsOn(-1), 'vs. yesterday'),
                    spark: $this->paymentsPerDay(7, 0)->values()->all()),
                $this->outstandingStat(),
            ];
        }

        return [
            ...$stats,
            $this->stat('waiting', 'Waiting Now', $this->countToday(AppointmentStatus::Waiting), 'number', 'rose', 'invoice',
                hint: 'In the waiting room'),
            $this->stat('done', 'Completed Today', $this->countToday(AppointmentStatus::Completed), 'number', 'violet', 'prescription',
                spark: $this->seenPerDay(7, 0)->values()->all()),
        ];
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function frontDeskStats(): array
    {
        $stats = [
            $this->stat('schedule', "Today's Schedule", $this->scheduleCount(0), 'number', 'blue', 'calendar',
                trend: $this->trend($this->scheduleCount(0), $this->scheduleCount(-1), 'vs. yesterday'),
                spark: $this->appointmentsPerDay(7)->values()->all()),
            $this->stat('waiting', 'Waiting Now', $this->countToday(AppointmentStatus::Waiting), 'number', 'green', 'patients',
                hint: 'In the waiting room'),
        ];

        if ($this->can(Permission::FinanceView)) {
            $today = $this->paymentsOn(0);

            return [
                ...$stats,
                $this->stat('payments', 'Payments Today', $today, 'money', 'rose', 'invoice',
                    trend: $this->trend($today, $this->paymentsOn(-1), 'vs. yesterday'),
                    spark: $this->paymentsPerDay(7, 0)->values()->all()),
                $this->outstandingStat(),
            ];
        }

        return [
            ...$stats,
            $this->stat('done', 'Completed Today', $this->countToday(AppointmentStatus::Completed), 'number', 'violet', 'prescription'),
            $this->stat('tomorrow', 'Booked Tomorrow', $this->scheduleCount(1), 'number', 'rose', 'invoice'),
        ];
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function clinicianStats(): array
    {
        $prescriptions = Prescription::query()
            ->where('dentist_id', $this->user->id)
            ->whereBetween('issued_at', $this->dayBounds(0))->count();

        return [
            $this->stat('mine', 'My Patients Today', $this->scheduleCount(0), 'number', 'blue', 'patients',
                trend: $this->trend($this->scheduleCount(0), $this->scheduleCount(-1), 'vs. yesterday'),
                spark: $this->appointmentsPerDay(7)->values()->all()),
            $this->stat('waiting', 'In Waiting Room', $this->countToday(AppointmentStatus::Waiting), 'number', 'green', 'calendar',
                hint: 'Ready to be seen'),
            $this->stat('done', 'Completed Today', $this->countToday(AppointmentStatus::Completed), 'number', 'violet', 'invoice',
                spark: $this->seenPerDay(7, 0)->values()->all()),
            $this->stat('prescriptions', 'Prescriptions Today', $prescriptions, 'number', 'rose', 'prescription'),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function outstandingStat(): array
    {
        $open = $this->outstanding();

        return $this->stat('outstanding', 'Outstanding Invoices', $open['total'], 'money', 'violet', 'prescription',
            hint: $open['count'].' unpaid '.($open['count'] === 1 ? 'invoice' : 'invoices'));
    }

    /**
     * @param  array<string, mixed>|null  $trend
     * @param  array<int, float|int>|null  $spark
     * @return array<string, mixed>
     */
    private function stat(string $key, string $label, float|int $value, string $format, string $tone, string $icon, ?array $trend = null, ?string $hint = null, ?array $spark = null): array
    {
        return compact('key', 'label', 'value', 'format', 'tone', 'icon', 'trend', 'hint', 'spark');
    }

    /**
     * @return array{pct: int, direction: string, label: string}|null
     */
    private function trend(float|int $current, float|int $previous, string $label): ?array
    {
        if ($previous <= 0) {
            return null;
        }

        $pct = (int) round((($current - $previous) / $previous) * 100);

        return [
            'pct' => abs($pct),
            'direction' => $pct > 0 ? 'up' : ($pct < 0 ? 'down' : 'flat'),
            'label' => $label,
        ];
    }

    /**
     * Clinicians see their own appointments plus unassigned ones; everyone else sees all.
     */
    private function scoped(): Builder
    {
        $query = Appointment::query();

        if ($this->isClinician()) {
            $query->where(fn (Builder $w) => $w->where('dentist_id', $this->user->id)->orWhereNull('dentist_id'));
        }

        return $query;
    }

    /**
     * @return array{0: Carbon, 1: Carbon}
     */
    private function dayBounds(int $offset): array
    {
        $day = now()->addDays($offset)->startOfDay();

        return [$day, $day->copy()->endOfDay()];
    }

    private function scheduleCount(int $offset): int
    {
        return $this->scoped()
            ->whereBetween('scheduled_at', $this->dayBounds($offset))
            ->whereNotIn('status', [AppointmentStatus::Cancelled->value, AppointmentStatus::NoShow->value])
            ->count();
    }

    private function countToday(AppointmentStatus $status): int
    {
        return $this->scoped()
            ->whereBetween('scheduled_at', $this->dayBounds(0))
            ->where('status', $status->value)
            ->count();
    }

    private function paymentsOn(int $offset): float
    {
        return round((float) Payment::query()->whereBetween('paid_at', $this->dayBounds($offset))->sum('amount'), 2);
    }

    /**
     * Zero-filled day => total map, ending `$endOffsetDays` days before today.
     *
     * @return Collection<string, float|int>
     */
    private function paymentsPerDay(int $days, int $endOffsetDays): Collection
    {
        return $this->perDay($days, $endOffsetDays, function (Carbon $from, Carbon $to) {
            return Payment::query()
                ->whereBetween('paid_at', [$from, $to])
                ->selectRaw('DATE(paid_at) as d, SUM(amount) as total')
                ->groupBy('d')->pluck('total', 'd');
        });
    }

    /**
     * @return Collection<string, float|int>
     */
    private function appointmentsPerDay(int $days): Collection
    {
        return $this->perDay($days, 0, function (Carbon $from, Carbon $to) {
            return $this->scoped()
                ->whereBetween('scheduled_at', [$from, $to])
                ->whereNotIn('status', [AppointmentStatus::Cancelled->value, AppointmentStatus::NoShow->value])
                ->selectRaw('DATE(scheduled_at) as d, COUNT(*) as total')
                ->groupBy('d')->pluck('total', 'd');
        });
    }

    /**
     * @return Collection<string, float|int>
     */
    private function seenPerDay(int $days, int $endOffsetDays): Collection
    {
        return $this->perDay($days, $endOffsetDays, function (Carbon $from, Carbon $to) {
            return $this->scoped()
                ->where('status', AppointmentStatus::Completed->value)
                ->whereBetween('scheduled_at', [$from, $to])
                ->selectRaw('DATE(scheduled_at) as d, COUNT(*) as total')
                ->groupBy('d')->pluck('total', 'd');
        });
    }

    /**
     * @param  callable(Carbon, Carbon): Collection<string, mixed>  $fetch
     * @return Collection<string, float|int>
     */
    private function perDay(int $days, int $endOffsetDays, callable $fetch): Collection
    {
        $end = now()->subDays($endOffsetDays)->endOfDay();
        $start = $end->copy()->subDays($days - 1)->startOfDay();
        $rows = $fetch($start, $end);

        return Collection::times($days, fn (int $i) => $start->copy()->addDays($i - 1)->toDateString())
            ->mapWithKeys(fn (string $date) => [$date => (float) ($rows[$date] ?? 0)]);
    }

    private function isOverdue(Appointment $appointment): bool
    {
        return $appointment->status === AppointmentStatus::Scheduled
            && $appointment->scheduled_at->lt(now()->subMinutes(10));
    }

    /**
     * Status changes this user may perform on the appointment.
     *
     * @return array<int, array{status: string, label: string}>
     */
    private function actionsFor(Appointment $appointment): array
    {
        $labels = [
            AppointmentStatus::Waiting->value => 'Check in',
            AppointmentStatus::InProgress->value => 'Start treatment',
            AppointmentStatus::Completed->value => 'Complete',
            AppointmentStatus::Cancelled->value => 'Cancel',
            AppointmentStatus::NoShow->value => 'No-show',
        ];

        return collect($appointment->status->nextStatuses())
            ->filter(fn (AppointmentStatus $to) => self::roleMayMove($this->user->role, $to))
            ->map(fn (AppointmentStatus $to) => ['status' => $to->value, 'label' => $labels[$to->value]])
            ->values()
            ->all();
    }

    /**
     * Who may set which status: arrival and cancellation need the queue permission,
     * running treatment needs the treat permission.
     */
    public static function roleMayMove(?Role $role, AppointmentStatus $to): bool
    {
        if ($role === null) {
            return false;
        }

        return match ($to) {
            AppointmentStatus::Waiting, AppointmentStatus::Cancelled, AppointmentStatus::NoShow
                => $role->grants(Permission::AppointmentsQueue),
            AppointmentStatus::InProgress, AppointmentStatus::Completed
                => $role->grants(Permission::AppointmentsTreat),
            default => false,
        };
    }

    /**
     * @return Collection<int, array<string, mixed>>
     */
    private function openInvoices(): Collection
    {
        return Invoice::query()
            ->where('status', '!=', InvoiceStatus::Paid->value)
            ->with('patient:id,name')
            ->withSum('payments', 'amount')
            ->orderBy('issued_at')
            ->get()
            ->map(fn (Invoice $i) => [
                'id' => $i->id,
                'number' => $i->number,
                'patient' => $i->patient->name,
                'description' => $i->description,
                'balance' => round((float) $i->amount - (float) ($i->payments_sum_amount ?? 0), 2),
                'issued' => $i->issued_at->format('M j'),
            ])
            ->filter(fn (array $i) => $i['balance'] > 0)
            ->values();
    }
}
