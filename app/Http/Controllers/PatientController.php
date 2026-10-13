<?php

namespace App\Http\Controllers;

use App\Enums\AppointmentStatus;
use App\Enums\Permission;
use App\Http\Requests\StorePatientRequest;
use App\Http\Requests\UpdatePatientRequest;
use App\Models\Appointment;
use App\Models\Consent;
use App\Models\MedicalHistory;
use App\Models\Patient;
use App\Support\Presenter;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;

class PatientController extends Controller
{
    public function index(Request $request): Response
    {
        $q = trim((string) $request->query('q', ''));

        $patients = Patient::query()
            ->with(['medicalHistory', 'consents'])
            ->withMax(['appointments as last_visit' => fn (Builder $b) => $b->where('status', AppointmentStatus::Completed->value)], 'scheduled_at')
            ->withMin(['appointments as next_visit' => fn (Builder $b) => $b
                ->whereIn('status', [AppointmentStatus::Scheduled->value, AppointmentStatus::Waiting->value])
                ->where('scheduled_at', '>=', now()->startOfDay())], 'scheduled_at')
            ->when($q !== '', fn (Builder $b) => $b->where(fn (Builder $w) => $w
                ->where('name', 'like', "%{$q}%")
                ->orWhere('phone', 'like', "%{$q}%")
                ->orWhere('national_id', 'like', "%{$q}%")))
            ->orderBy('name')
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('Patients/Index', [
            'q' => $q,
            'patients' => [
                'data' => $patients->getCollection()->map(function (Patient $p) {
                    $summary = Presenter::patient($p);

                    return [
                        'id' => $p->id,
                        'name' => $p->name,
                        'phone' => $p->phone,
                        'age' => $p->age(),
                        'gender' => $p->gender,
                        'missing_count' => count($summary['intake']['missing']),
                        'last_visit' => $p->last_visit ? Carbon::parse($p->last_visit)->format('M j, Y') : null,
                        'next_visit' => $p->next_visit ? Carbon::parse($p->next_visit)->format('M j, h:i A') : null,
                    ];
                })->all(),
                'page' => $patients->currentPage(),
                'last_page' => $patients->lastPage(),
                'total' => $patients->total(),
                'per_page' => $patients->perPage(),
            ],
        ]);
    }

    /**
     * Type-ahead used by the check-in desk and the command palette.
     */
    public function search(Request $request): JsonResponse
    {
        $q = trim((string) $request->query('q', ''));
        $showAlerts = $request->user()->hasPermission(Permission::ClinicalView);

        if (mb_strlen($q) < 2) {
            return response()->json(['patients' => []]);
        }

        $patients = Patient::query()
            ->with(['medicalHistory', 'consents'])
            ->where(fn (Builder $w) => $w
                ->where('name', 'like', "%{$q}%")
                ->orWhere('phone', 'like', "%{$q}%")
                ->orWhere('national_id', 'like', "%{$q}%"))
            ->orderBy('name')
            ->limit(8)
            ->get();

        return response()->json([
            'patients' => $patients->map(fn (Patient $p) => [
                ...Presenter::patient($p, $showAlerts),
                'today' => $this->todaysAppointments($p, $showAlerts),
            ])->all(),
        ]);
    }

    public function summary(Request $request, Patient $patient): JsonResponse
    {
        $showAlerts = $request->user()->hasPermission(Permission::ClinicalView);

        $patient->loadMissing(['medicalHistory', 'consents']);
        $history = $patient->medicalHistory;

        return response()->json([
            'patient' => [
                ...Presenter::patient($patient, $showAlerts),
                'today' => $this->todaysAppointments($patient, $showAlerts),
                'details' => [
                    'phone' => $patient->phone,
                    'date_of_birth' => $patient->date_of_birth?->toDateString(),
                    'gender' => $patient->gender,
                    'address' => $patient->address,
                    'national_id' => $patient->national_id,
                    'emergency_contact_name' => $patient->emergency_contact_name,
                    'emergency_contact_phone' => $patient->emergency_contact_phone,
                    'emergency_contact_relationship' => $patient->emergency_contact_relationship,
                    'guardian_name' => $patient->guardian_name,
                    'guardian_phone' => $patient->guardian_phone,
                    'medical_aid_provider' => $patient->medical_aid_provider,
                    'medical_aid_number' => $patient->medical_aid_number,
                ],
                'history_recorded' => $history !== null,
                'history_updated' => $history?->updated_at->format('M j, Y'),
                // Only clinical roles may read the history back; others can still replace it.
                'history' => $showAlerts && $history ? [
                    'allergies' => $history->allergies,
                    'conditions' => $history->conditions ?? [],
                    'other_conditions' => $history->other_conditions,
                    'medications' => $history->medications,
                    'is_pregnant' => $history->is_pregnant,
                    'is_smoker' => $history->is_smoker,
                    'last_dental_visit' => $history->last_dental_visit?->toDateString(),
                    'notes' => $history->notes,
                ] : null,
                'consents' => collect(Consent::TYPES)->map(function (array $info, string $type) use ($patient) {
                    $latest = $patient->consents->where('type', $type)->sortByDesc('consented_at')->first();

                    return [
                        'type' => $type,
                        'label' => $info['label'],
                        'description' => $info['description'],
                        'required' => $info['required'],
                        'valid' => $latest?->isValid() ?? false,
                        'signed_by_name' => $latest?->signed_by_name,
                        'on' => $latest?->consented_at->format('M j, Y'),
                    ];
                })->values()->all(),
            ],
        ]);
    }

    public function show(Request $request, Patient $patient): Response
    {
        $user = $request->user();
        $patient->load(['medicalHistory', 'consents.witness:id,name', 'registeredBy:id,name']);
        $showClinical = $user->hasPermission(Permission::ClinicalView);

        $appointments = $patient->appointments()
            ->with(['dentist:id,name'])
            ->orderByDesc('scheduled_at')
            ->limit(15)
            ->get()
            ->map(fn (Appointment $a) => Presenter::appointment($a) + [
                'date' => $a->scheduled_at->format('M j, Y'),
            ])
            ->all();

        $finance = null;

        if ($user->hasPermission(Permission::FinanceView)) {
            $invoices = $patient->invoices()->withSum('payments', 'amount')->get();
            $finance = [
                'billed' => round((float) $invoices->sum('amount'), 2),
                'paid' => round((float) $invoices->sum('payments_sum_amount'), 2),
                'balance' => round((float) $invoices->sum('amount') - (float) $invoices->sum('payments_sum_amount'), 2),
            ];
        }

        $history = $patient->medicalHistory;

        return Inertia::render('Patients/Show', [
            'patient' => [
                ...Presenter::patient($patient, $showClinical),
                'address' => $patient->address,
                'national_id' => $patient->national_id,
                'emergency_contact_name' => $patient->emergency_contact_name,
                'emergency_contact_phone' => $patient->emergency_contact_phone,
                'emergency_contact_relationship' => $patient->emergency_contact_relationship,
                'guardian_name' => $patient->guardian_name,
                'guardian_phone' => $patient->guardian_phone,
                'medical_aid_provider' => $patient->medical_aid_provider,
                'medical_aid_number' => $patient->medical_aid_number,
                'notes' => $patient->notes,
                'registered' => $patient->created_at->format('M j, Y'),
                'registered_by' => $patient->registeredBy?->name,
            ],
            // Medical details are clinical data: only roles with clinical access receive them.
            'history' => $showClinical && $history ? [
                'allergies' => $history->allergies,
                'conditions' => $history->conditions ?? [],
                'other_conditions' => $history->other_conditions,
                'medications' => $history->medications,
                'is_pregnant' => $history->is_pregnant,
                'is_smoker' => $history->is_smoker,
                'last_dental_visit' => $history->last_dental_visit?->toDateString(),
                'notes' => $history->notes,
                'updated' => $history->updated_at->format('M j, Y'),
            ] : null,
            'historyRecorded' => $history !== null,
            'consents' => $patient->consents->sortByDesc('consented_at')->values()->map(fn (Consent $c) => [
                'id' => $c->id,
                'type' => $c->type,
                'label' => Consent::TYPES[$c->type]['label'] ?? $c->type,
                'signed_by_name' => $c->signed_by_name,
                'relationship' => $c->relationship,
                'consented_at' => $c->consented_at->format('M j, Y'),
                'expires_at' => $c->expires_at?->format('M j, Y'),
                'is_valid' => $c->isValid(),
                'revoked' => $c->revoked_at !== null,
                'witness' => $c->witness?->name,
            ])->all(),
            'consentTypes' => collect(Consent::TYPES)->map(fn (array $info, string $type) => [
                'type' => $type,
                ...$info,
            ])->values()->all(),
            'conditionOptions' => collect(MedicalHistory::CONDITIONS)->map(fn (string $label, string $key) => [
                'key' => $key,
                'label' => $label,
            ])->values()->all(),
            'appointments' => $appointments,
            'dentists' => \App\Models\User::query()->practitioners()
                ->orderBy('name')->get(['id', 'name'])->all(),
            'finance' => $finance,
            'can' => [
                'update' => $user->hasPermission(Permission::PatientsUpdate),
                'book' => $user->hasPermission(Permission::AppointmentsBook),
                'clinical' => $showClinical,
            ],
        ]);
    }

    public function store(StorePatientRequest $request): JsonResponse|RedirectResponse
    {
        $patient = Patient::create([
            ...$request->validated(),
            'registered_by' => $request->user()->id,
        ]);

        if ($request->wantsJson()) {
            return response()->json([
                'patient' => [...Presenter::patient($patient), 'today' => []],
            ], 201);
        }

        return back()->with('message', "{$patient->name} was registered.");
    }

    public function update(UpdatePatientRequest $request, Patient $patient): JsonResponse|RedirectResponse
    {
        $patient->update($request->validated());

        if ($request->wantsJson()) {
            return response()->json(['patient' => Presenter::patient($patient->fresh())]);
        }

        return back()->with('message', "{$patient->name} was updated.");
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function todaysAppointments(Patient $patient, bool $withAlerts): array
    {
        return $patient->appointments()
            ->whereBetween('scheduled_at', [now()->startOfDay(), now()->endOfDay()])
            ->whereNotIn('status', [AppointmentStatus::Cancelled->value, AppointmentStatus::NoShow->value])
            ->with('dentist:id,name')
            ->orderBy('scheduled_at')
            ->get()
            ->map(fn (Appointment $a) => Presenter::appointment($a, $withAlerts))
            ->all();
    }
}
