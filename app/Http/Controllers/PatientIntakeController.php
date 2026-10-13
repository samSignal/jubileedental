<?php

namespace App\Http\Controllers;

use App\Enums\Permission;
use App\Http\Requests\SaveIntakeRequest;
use App\Models\Consent;
use App\Models\Patient;
use App\Support\Presenter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;

class PatientIntakeController extends Controller
{
    /** Patient columns the intake form may set. */
    private const PATIENT_FIELDS = [
        'phone', 'date_of_birth', 'gender', 'address', 'national_id',
        'emergency_contact_name', 'emergency_contact_phone', 'emergency_contact_relationship',
        'guardian_name', 'guardian_phone', 'medical_aid_provider', 'medical_aid_number',
    ];

    /**
     * Save contact details, medical history and consents in one step.
     */
    public function store(SaveIntakeRequest $request, Patient $patient): JsonResponse|RedirectResponse
    {
        $actor = $request->user();

        DB::transaction(function () use ($request, $patient, $actor) {
            $details = Arr::only($request->validated(), self::PATIENT_FIELDS);

            if ($details !== []) {
                $patient->fill($details)->save();
            }

            if ($request->has('medical_history')) {
                $history = $request->validated('medical_history') ?? [];

                $patient->medicalHistory()->updateOrCreate([], [
                    'allergies' => $history['allergies'] ?? null,
                    'conditions' => array_values($history['conditions'] ?? []),
                    'other_conditions' => $history['other_conditions'] ?? null,
                    'medications' => $history['medications'] ?? null,
                    'is_pregnant' => $history['is_pregnant'] ?? null,
                    'is_smoker' => $history['is_smoker'] ?? null,
                    'last_dental_visit' => $history['last_dental_visit'] ?? null,
                    'notes' => $history['notes'] ?? null,
                    'recorded_by' => $actor->id,
                ]);
            }

            foreach ($request->validated('consents') ?? [] as $given) {
                $alreadyValid = $patient->consents()->valid()->where('type', $given['type'])->exists();

                if ($alreadyValid) {
                    continue;
                }

                $patient->consents()->create([
                    'type' => $given['type'],
                    'signed_by_name' => $given['signed_by_name'],
                    'relationship' => $given['relationship'],
                    'consented_at' => now(),
                    // Treatment consent is renewed yearly; the rest do not expire.
                    'expires_at' => $given['type'] === Consent::TREATMENT ? now()->addYear() : null,
                    'witnessed_by' => $actor->id,
                ]);
            }
        });

        $patient = $patient->fresh(['medicalHistory', 'consents']);

        if ($request->wantsJson()) {
            return response()->json([
                'patient' => Presenter::patient($patient, $actor->hasPermission(Permission::ClinicalView)),
            ]);
        }

        return back()->with('message', "{$patient->name}'s intake was saved.");
    }

    public function revokeConsent(Request $request, Consent $consent): JsonResponse|RedirectResponse
    {
        $consent->forceFill(['revoked_at' => now()])->save();

        if ($request->wantsJson()) {
            return response()->json(['consent' => ['id' => $consent->id, 'revoked' => true]]);
        }

        return back()->with('message', 'Consent withdrawn. The patient will be asked to sign again before their next check-in.');
    }
}
