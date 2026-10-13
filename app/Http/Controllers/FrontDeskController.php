<?php

namespace App\Http\Controllers;

use App\Enums\AppointmentStatus;
use App\Enums\Permission;
use App\Models\Appointment;
use App\Models\Payment;
use App\Models\Service;
use App\Models\User;
use App\Services\Scheduling;
use App\Services\VisitBilling;
use App\Support\Presenter;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Reception: one screen for the whole day. Today's patients, the waiting queue,
 * patient search, quick registration and payment all start here.
 */
class FrontDeskController extends Controller
{
    public function __construct(
        private readonly Scheduling $scheduling,
        private readonly VisitBilling $billing,
    ) {}

    public function index(Request $request): Response
    {
        $user = $request->user();
        $showAlerts = $user->hasPermission(Permission::ClinicalView);
        $canCollect = $user->hasPermission(Permission::PaymentsRecord);

        $today = Appointment::query()
            ->whereBetween('scheduled_at', [now()->startOfDay(), now()->endOfDay()])
            ->whereNotIn('status', [AppointmentStatus::Cancelled->value, AppointmentStatus::NoShow->value])
            ->with(['patient.medicalHistory', 'patient.consents', 'dentist:id,name', 'services', 'invoice.payments'])
            ->orderBy('scheduled_at')
            ->get();

        $rows = $today->map(function (Appointment $a) use ($showAlerts, $canCollect) {
            $row = Presenter::appointment($a, $showAlerts, true);

            if ($a->status === AppointmentStatus::Completed && $canCollect) {
                $row['billing'] = $this->billing->summary($a);
            }

            return $row;
        })->values();

        $collected = $canCollect
            ? round((float) Payment::query()->whereBetween('paid_at', [now()->startOfDay(), now()->endOfDay()])->sum('amount'), 2)
            : null;

        $toCollect = $rows->filter(fn (array $r) => isset($r['billing']) && ! $r['billing']['settled'])->count();

        $dentists = User::query()->practitioners()->orderBy('name')->get(['id', 'name']);

        return Inertia::render('FrontDesk/Index', [
            'rows' => $rows->all(),
            'stats' => [
                'appointments' => $today->count(),
                'waiting' => $today->where('status', AppointmentStatus::Waiting)->count(),
                'with_dentist' => $today->where('status', AppointmentStatus::InProgress)->count(),
                'to_collect' => $toCollect,
                'collected' => $collected,
            ],
            'dentists' => $dentists->map(fn (User $d) => [
                'id' => $d->id,
                'name' => $d->name,
                'configured' => $this->scheduling->hasSchedule($d),
            ])->all(),
            'services' => $canCollect
                ? Service::active()->orderBy('name')->get(['id', 'name', 'price'])
                    ->map(fn (Service $s) => ['id' => $s->id, 'name' => $s->name, 'price' => (float) $s->price])->all()
                : [],
            'can' => [
                'createPatient' => $user->hasPermission(Permission::PatientsCreate),
                'book' => $user->hasPermission(Permission::AppointmentsBook),
                'collect' => $canCollect,
            ],
        ]);
    }
}
