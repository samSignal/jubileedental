<?php

namespace App\Support;

use App\Enums\AppointmentStatus;
use App\Models\Appointment;
use App\Models\Patient;
use App\Services\PatientIntake;

/**
 * Turns models into the plain arrays the front end consumes, so every page and
 * JSON endpoint describes an appointment or patient the same way.
 */
class Presenter
{
    /**
     * @return array<string, mixed>
     */
    public static function appointment(Appointment $a, bool $withAlerts = false, bool $withIntake = false): array
    {
        $a->loadMissing(['patient.medicalHistory', 'patient.consents', 'dentist:id,name']);

        $data = [
            'id' => $a->id,
            'patient_id' => $a->patient_id,
            'patient' => $a->patient->name,
            'dentist_id' => $a->dentist_id,
            'dentist' => $a->dentist?->name,
            'procedure' => $a->procedure,
            'scheduled_at' => $a->scheduled_at->toIso8601String(),
            'time' => $a->scheduled_at->format('h:i A'),
            'ends' => $a->endsAt()->format('h:i A'),
            'duration_minutes' => $a->duration_minutes,
            'status' => $a->status->value,
            'status_label' => $a->status->label(),
            'queue_number' => $a->queue_number,
            'queue_label' => $a->queueLabel(),
            'is_walk_in' => $a->is_walk_in,
            'intake_overridden' => $a->intake_overridden,
            'checked_in_at' => $a->checked_in_at?->toIso8601String(),
            'checked_in_time' => $a->checked_in_at?->format('h:i A'),
            'waiting_minutes' => $a->status === AppointmentStatus::Waiting && $a->checked_in_at
                ? (int) $a->checked_in_at->diffInMinutes(now())
                : null,
        ];

        if ($withIntake) {
            $data['intake_missing'] = PatientIntake::missing($a->patient);
            $data['consent_pending'] = PatientIntake::consentPending($a->patient);
            $data['history_status'] = PatientIntake::historyStatus($a->patient);
        }

        if ($withAlerts) {
            $data['alerts'] = $a->patient->alerts();
        }

        return $data;
    }

    /**
     * Everything the front desk needs to know about a patient at a glance.
     *
     * @return array<string, mixed>
     */
    public static function patient(Patient $p, bool $withAlerts = false): array
    {
        $p->loadMissing(['medicalHistory', 'consents']);
        $missing = PatientIntake::missing($p);

        $data = [
            'id' => $p->id,
            'name' => $p->name,
            'phone' => $p->phone,
            'email' => $p->email,
            'date_of_birth' => $p->date_of_birth?->toDateString(),
            'age' => $p->age(),
            'is_minor' => $p->isMinor(),
            'gender' => $p->gender,
            'intake' => ['complete' => $missing === [], 'missing' => $missing],
            'consent_pending' => PatientIntake::consentPending($p),
            'history_status' => PatientIntake::historyStatus($p),
        ];

        if ($withAlerts) {
            $data['alerts'] = $p->alerts();
        }

        return $data;
    }
}
