<?php

namespace App\Services;

use App\Enums\AppointmentStatus;
use App\Enums\Permission;
use App\Models\Appointment;
use App\Models\Consent;
use App\Models\Patient;
use App\Models\User;
use App\Notifications\PatientReadyForAssessment;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Illuminate\Validation\ValidationException;

/**
 * Check-in is one action: ticket number, arrival time, and the dentist is told.
 *
 * It never blocks on paperwork. If consent is due the receptionist can record it
 * in the same step; if it is skipped the visit is flagged and the dentist sees
 * "consent pending" alongside the allergies and history review.
 */
class QueueService
{
    /**
     * @param  array{signed_by_name: string, relationship: string}|null  $consent
     *
     * @throws ValidationException
     */
    public function checkIn(Appointment $appointment, ?User $actor = null, ?array $consent = null): Appointment
    {
        if ($appointment->status !== AppointmentStatus::Scheduled) {
            throw ValidationException::withMessages([
                'status' => "This patient is already {$appointment->status->label()}.",
            ]);
        }

        DB::transaction(function () use ($appointment, $actor, $consent) {
            if ($consent !== null) {
                $this->recordRequiredConsents($appointment->patient, $consent, $actor);
            }

            $today = now()->toDateString();
            $next = ((int) Appointment::query()->where('queue_date', $today)->lockForUpdate()->max('queue_number')) + 1;

            $appointment->forceFill([
                'status' => AppointmentStatus::Waiting,
                'checked_in_at' => now(),
                'queue_number' => $next,
                'queue_date' => $today,
                // Recorded when the visit goes ahead with consent still outstanding.
                'intake_overridden' => PatientIntake::consentPending($appointment->patient->fresh(['consents'])),
                'ready_notified_at' => now(),
            ])->save();
        });

        $this->notifyDentist($appointment->fresh(['patient.medicalHistory', 'patient.consents', 'dentist']));

        return $appointment->fresh(['patient', 'dentist']);
    }

    /**
     * One signature covers the required consents that are not currently valid.
     *
     * @param  array{signed_by_name: string, relationship: string}  $consent
     */
    public function recordRequiredConsents(Patient $patient, array $consent, ?User $actor): void
    {
        foreach (Consent::TYPES as $type => $info) {
            if (! $info['required'] || $patient->consents()->valid()->where('type', $type)->exists()) {
                continue;
            }

            $patient->consents()->create([
                'type' => $type,
                'signed_by_name' => $consent['signed_by_name'],
                'relationship' => $consent['relationship'],
                'consented_at' => now(),
                'expires_at' => $type === Consent::TREATMENT ? now()->addYear() : null,
                'witnessed_by' => $actor?->id,
            ]);
        }
    }

    /**
     * Tell the assigned dentist (or, if unassigned, every dentist on duty) the
     * patient is ready for assessment.
     *
     * @return Collection<int, User>
     */
    public function notifyDentist(Appointment $appointment): Collection
    {
        $recipients = $appointment->dentist && $appointment->dentist->hasPermission(Permission::AppointmentsTreat)
            ? collect([$appointment->dentist])
            : User::query()->practitioners()->get();

        Notification::send($recipients, new PatientReadyForAssessment($appointment));

        $appointment->forceFill(['ready_notified_at' => now()])->save();

        return $recipients;
    }
}
