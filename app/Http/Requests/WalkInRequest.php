<?php

namespace App\Http\Requests;

use App\Enums\Permission;
use App\Models\Role;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class WalkInRequest extends FormRequest
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
            'patient_id' => ['required', 'integer', 'exists:patients,id'],
            'dentist_id' => [
                'nullable', 'integer',
                Rule::exists('users', 'id')->where(fn ($query) => $query
                    ->where('is_active', true)
                    ->whereIn('role_id', Role::idsGranting(Permission::AppointmentsTreat))),
            ],
            'procedure' => ['required', 'string', 'max:120'],
            // Put them straight into today's queue in the same step.
            'check_in' => ['nullable', 'boolean'],
            'consent' => ['nullable', 'array'],
            'consent.signed_by_name' => ['required_with:consent', 'string', 'max:120'],
            'consent.relationship' => ['required_with:consent', 'in:self,parent,guardian'],
        ];
    }
}
