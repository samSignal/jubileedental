<?php

namespace App\Notifications;

use App\Models\Appointment;
use Illuminate\Notifications\Notification;

/**
 * "Patient is ready for clinical assessment", stored for the in-app bell.
 */
class PatientReadyForAssessment extends Notification
{
    public function __construct(public Appointment $appointment) {}

    /**
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['database'];
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        $appointment = $this->appointment->loadMissing('patient.medicalHistory');
        $patient = $appointment->patient;

        $ticket = $appointment->queueLabel();

        return [
            'kind' => 'patient_ready',
            'title' => 'Patient ready: '.$patient->name.($ticket ? " ({$ticket})" : ''),
            'body' => $appointment->procedure
                .($appointment->checked_in_at ? ' · arrived '.$appointment->checked_in_at->format('h:i A') : ''),
            'appointment_id' => $appointment->id,
            'patient_id' => $patient->id,
            'patient' => $patient->name,
            'queue_number' => $appointment->queue_number,
            'procedure' => $appointment->procedure,
            'alerts' => $patient->alerts(),
            'intake_overridden' => $appointment->intake_overridden,
            'consent_pending' => \App\Services\PatientIntake::consentPending($patient),
            'history_status' => \App\Services\PatientIntake::historyStatus($patient),
        ];
    }
}
