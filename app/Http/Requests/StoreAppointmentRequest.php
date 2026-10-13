<?php

namespace App\Http\Requests;

use App\Enums\Permission;
use App\Models\Role;
use App\Models\User;
use App\Services\Scheduling;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Carbon;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StoreAppointmentRequest extends FormRequest
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
                // Any active user whose role can treat patients may be assigned.
                Rule::exists('users', 'id')->where(fn ($query) => $query
                    ->where('is_active', true)
                    ->whereIn('role_id', Role::idsGranting(Permission::AppointmentsTreat))),
            ],
            'procedure' => ['required', 'string', 'max:120'],
            'scheduled_at' => ['required', 'date'],
            'duration_minutes' => ['nullable', 'integer', 'min:10', 'max:480'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ];
    }

    /**
     * Enforce the dentist's working hours and prevent double-booking.
     *
     * @return array<int, callable(Validator): void>
     */
    public function after(): array
    {
        return [function (Validator $validator): void {
            if ($validator->errors()->isNotEmpty() || ! $this->filled('dentist_id')) {
                return;
            }

            $dentist = User::find($this->integer('dentist_id'));
            $start = Carbon::parse($this->input('scheduled_at'));
            $end = $start->copy()->addMinutes($this->integer('duration_minutes') ?: 30);
            $scheduling = app(Scheduling::class);

            if (! $scheduling->withinWorkingHours($dentist, $start, $end)) {
                $validator->errors()->add('scheduled_at', "{$dentist->name} does not work at that time.");
            } elseif ($scheduling->conflicts($dentist, $start, $end)) {
                $validator->errors()->add('scheduled_at', "{$dentist->name} already has an appointment at that time.");
            }
        }];
    }
}
