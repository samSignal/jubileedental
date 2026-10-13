<?php

namespace App\Models;

use Database\Factories\PatientFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

#[Fillable([
    'name', 'phone', 'email', 'date_of_birth', 'gender', 'address', 'national_id',
    'emergency_contact_name', 'emergency_contact_phone', 'emergency_contact_relationship',
    'guardian_name', 'guardian_phone', 'medical_aid_provider', 'medical_aid_number',
    'notes', 'is_demo', 'registered_by',
])]
class Patient extends Model
{
    /** @use HasFactory<PatientFactory> */
    use HasFactory;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'date_of_birth' => 'date',
            'is_demo' => 'boolean',
        ];
    }

    public function appointments(): HasMany
    {
        return $this->hasMany(Appointment::class);
    }

    public function invoices(): HasMany
    {
        return $this->hasMany(Invoice::class);
    }

    public function medicalHistory(): HasOne
    {
        return $this->hasOne(MedicalHistory::class);
    }

    public function consents(): HasMany
    {
        return $this->hasMany(Consent::class);
    }

    public function registeredBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'registered_by');
    }

    public function age(): ?int
    {
        return $this->date_of_birth?->age;
    }

    public function isMinor(): bool
    {
        return $this->age() !== null && $this->age() < 18;
    }

    /**
     * Safety flags from the medical history (empty when none is recorded).
     *
     * @return array<int, string>
     */
    public function alerts(): array
    {
        return $this->medicalHistory?->alerts() ?? [];
    }
}
