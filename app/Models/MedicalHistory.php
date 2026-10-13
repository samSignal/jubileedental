<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'patient_id', 'allergies', 'conditions', 'other_conditions', 'medications',
    'is_pregnant', 'is_smoker', 'last_dental_visit', 'notes', 'recorded_by',
])]
class MedicalHistory extends Model
{
    /**
     * Conditions that change how a dentist treats someone. The keys are stored.
     *
     * @var array<string, string>
     */
    public const CONDITIONS = [
        'diabetes' => 'Diabetes',
        'hypertension' => 'High blood pressure',
        'heart_disease' => 'Heart disease',
        'asthma' => 'Asthma',
        'epilepsy' => 'Epilepsy',
        'bleeding_disorder' => 'Bleeding disorder',
        'hiv' => 'HIV',
        'hepatitis' => 'Hepatitis',
        'tuberculosis' => 'Tuberculosis',
        'kidney_disease' => 'Kidney disease',
        'cancer' => 'Cancer',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'conditions' => 'array',
            'is_pregnant' => 'boolean',
            'is_smoker' => 'boolean',
            'last_dental_visit' => 'date',
        ];
    }

    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class);
    }

    /**
     * Short safety flags for staff: allergies and conditions that matter at the chair.
     *
     * @return array<int, string>
     */
    public function alerts(): array
    {
        $alerts = [];

        if (filled($this->allergies)) {
            $alerts[] = 'Allergy: '.trim($this->allergies);
        }

        foreach ($this->conditions ?? [] as $key) {
            if (isset(self::CONDITIONS[$key])) {
                $alerts[] = self::CONDITIONS[$key];
            }
        }

        if (filled($this->other_conditions)) {
            $alerts[] = trim($this->other_conditions);
        }

        if ($this->is_pregnant) {
            $alerts[] = 'Pregnant';
        }

        return $alerts;
    }
}
