<?php

namespace App\Models;

use App\Enums\AppointmentStatus;
use Database\Factories\AppointmentFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

#[Fillable([
    'patient_id', 'dentist_id', 'procedure', 'scheduled_at', 'duration_minutes',
    'status', 'queue_number', 'queue_date', 'is_walk_in', 'intake_overridden',
    'ready_notified_at', 'reschedule_count',
    'checked_in_at', 'started_at', 'completed_at', 'notes',
])]
class Appointment extends Model
{
    /** @use HasFactory<AppointmentFactory> */
    use HasFactory;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'scheduled_at' => 'datetime',
            'checked_in_at' => 'datetime',
            'started_at' => 'datetime',
            'completed_at' => 'datetime',
            'ready_notified_at' => 'datetime',
            'is_walk_in' => 'boolean',
            'intake_overridden' => 'boolean',
            'status' => AppointmentStatus::class,
        ];
    }

    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class);
    }

    public function services(): HasMany
    {
        return $this->hasMany(AppointmentService::class);
    }

    public function invoice(): HasOne
    {
        return $this->hasOne(Invoice::class);
    }

    public function dentist(): BelongsTo
    {
        return $this->belongsTo(User::class, 'dentist_id');
    }

    /**
     * Ticket label such as "Q-007", or null before the patient has checked in.
     */
    public function queueLabel(): ?string
    {
        return $this->queue_number === null
            ? null
            : 'Q-'.str_pad((string) $this->queue_number, 3, '0', STR_PAD_LEFT);
    }

    public function endsAt(): \Illuminate\Support\Carbon
    {
        return $this->scheduled_at->copy()->addMinutes($this->duration_minutes ?: 30);
    }
}
