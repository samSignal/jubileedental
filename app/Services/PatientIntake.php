<?php

namespace App\Services;

use App\Models\Consent;
use App\Models\Patient;

/**
 * What is worth flagging about a patient's record. Nothing here blocks a visit:
 * the front desk checks people in regardless, and gaps travel with the patient so
 * the dentist can review them before treatment.
 *
 * Essentials are kept short on purpose: a phone number, a date of birth, a
 * guardian for children, treatment and privacy consent (renewed yearly), and a
 * medical history that is on file and not out of date.
 */
class PatientIntake
{
    /** A medical history older than this is flagged for review. */
    public const HISTORY_REVIEW_MONTHS = 12;

    /**
     * @return array<int, array{key: string, label: string, section: string}>
     */
    public static function missing(Patient $patient): array
    {
        $patient->loadMissing(['medicalHistory', 'consents']);
        $missing = [];

        $need = function (string $key, string $label, string $section, bool $present) use (&$missing): void {
            if (! $present) {
                $missing[] = compact('key', 'label', 'section');
            }
        };

        $need('phone', 'Phone number', 'details', filled($patient->phone));
        $need('date_of_birth', 'Date of birth', 'details', $patient->date_of_birth !== null);

        if ($patient->isMinor()) {
            $need('guardian', 'Parent or guardian (name and phone)', 'details',
                filled($patient->guardian_name) && filled($patient->guardian_phone));
        }

        $status = self::historyStatus($patient);
        $need('medical_history', $status === 'outdated'
            ? 'Medical history needs review (over a year old)'
            : 'Medical history', 'medical', $status === 'ok');

        foreach (Consent::TYPES as $type => $info) {
            if (! $info['required']) {
                continue;
            }

            $need("consent_{$type}", $info['label'], 'consent',
                $patient->consents->contains(fn (Consent $c) => $c->type === $type && $c->isValid()));
        }

        return $missing;
    }

    /**
     * 'ok', 'missing' (none on file) or 'outdated' (not reviewed within a year).
     */
    public static function historyStatus(Patient $patient): string
    {
        $patient->loadMissing('medicalHistory');
        $history = $patient->medicalHistory;

        if ($history === null) {
            return 'missing';
        }

        return $history->updated_at->lt(now()->subMonths(self::HISTORY_REVIEW_MONTHS)) ? 'outdated' : 'ok';
    }

    public static function consentPending(Patient $patient): bool
    {
        return collect(self::missing($patient))->contains(fn (array $m) => str_starts_with($m['key'], 'consent_'));
    }

    public static function isComplete(Patient $patient): bool
    {
        return self::missing($patient) === [];
    }
}
