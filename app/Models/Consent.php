<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'patient_id', 'type', 'signed_by_name', 'relationship', 'consented_at',
    'expires_at', 'revoked_at', 'witnessed_by', 'notes',
])]
class Consent extends Model
{
    public const TREATMENT = 'treatment';

    public const PRIVACY = 'privacy';

    public const PHOTOGRAPHY = 'photography';

    /**
     * Every consent type, with a plain-language label and whether it is required
     * before a patient can be checked in.
     *
     * @var array<string, array{label: string, description: string, required: bool}>
     */
    public const TYPES = [
        self::TREATMENT => [
            'label' => 'Consent to treatment',
            'description' => 'The patient agrees to examination and dental treatment at Jubilee Dental. Renewed every 12 months.',
            'required' => true,
        ],
        self::PRIVACY => [
            'label' => 'Privacy and data consent',
            'description' => 'The patient agrees to the clinic keeping and using their personal and medical records.',
            'required' => true,
        ],
        self::PHOTOGRAPHY => [
            'label' => 'Photographs and X-rays for records',
            'description' => 'Optional. Clinical photographs may be added to the patient file.',
            'required' => false,
        ],
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'consented_at' => 'datetime',
            'expires_at' => 'datetime',
            'revoked_at' => 'datetime',
        ];
    }

    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class);
    }

    public function witness(): BelongsTo
    {
        return $this->belongsTo(User::class, 'witnessed_by');
    }

    public function isValid(): bool
    {
        return $this->revoked_at === null
            && ($this->expires_at === null || $this->expires_at->isFuture());
    }

    public function scopeValid(Builder $query): Builder
    {
        return $query->whereNull('revoked_at')
            ->where(fn (Builder $q) => $q->whereNull('expires_at')->orWhere('expires_at', '>', now()));
    }
}
