<?php

namespace App\Http\Requests;

use App\Models\Consent;
use App\Models\MedicalHistory;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SaveIntakeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'phone' => ['nullable', 'string', 'max:32'],
            'date_of_birth' => ['nullable', 'date', 'before:tomorrow'],
            'gender' => ['nullable', 'in:female,male,other'],
            'address' => ['nullable', 'string', 'max:255'],
            'national_id' => ['nullable', 'string', 'max:32'],
            'emergency_contact_name' => ['nullable', 'string', 'max:120'],
            'emergency_contact_phone' => ['nullable', 'string', 'max:32'],
            'emergency_contact_relationship' => ['nullable', 'string', 'max:40'],
            'guardian_name' => ['nullable', 'string', 'max:120'],
            'guardian_phone' => ['nullable', 'string', 'max:32'],
            'medical_aid_provider' => ['nullable', 'string', 'max:120'],
            'medical_aid_number' => ['nullable', 'string', 'max:64'],

            'medical_history' => ['nullable', 'array'],
            'medical_history.allergies' => ['nullable', 'string', 'max:500'],
            'medical_history.conditions' => ['nullable', 'array'],
            'medical_history.conditions.*' => ['string', Rule::in(array_keys(MedicalHistory::CONDITIONS))],
            'medical_history.other_conditions' => ['nullable', 'string', 'max:255'],
            'medical_history.medications' => ['nullable', 'string', 'max:500'],
            'medical_history.is_pregnant' => ['nullable', 'boolean'],
            'medical_history.is_smoker' => ['nullable', 'boolean'],
            'medical_history.last_dental_visit' => ['nullable', 'date', 'before:tomorrow'],
            'medical_history.notes' => ['nullable', 'string', 'max:1000'],

            'consents' => ['nullable', 'array'],
            'consents.*.type' => ['required', 'string', Rule::in(array_keys(Consent::TYPES))],
            'consents.*.signed_by_name' => ['required', 'string', 'max:120'],
            'consents.*.relationship' => ['required', 'in:self,parent,guardian'],
        ];
    }
}
