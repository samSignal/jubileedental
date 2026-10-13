<?php

namespace App\Http\Requests;

use App\Enums\AppointmentStatus;
use App\Enums\Permission;
use App\Models\Appointment;
use App\Models\Role;
use App\Models\User;
use App\Services\Scheduling;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Carbon;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class RescheduleAppointmentRequest extends FormRequest
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
            'scheduled_at' => ['required', 'date'],
            'dentist_id' => [
                'nullable', 'integer',
                Rule::exists('users', 'id')->where(fn ($query) => $query
                    ->where('is_active', true)
                    ->whereIn('role_id', Role::idsGranting(Permission::AppointmentsTreat))),
            ],
            'duration_minutes' => ['nullable', 'integer', 'min:10', 'max:480'],
        ];
    }

    /**
     * @return array<int, callable(Validator): void>
     */
    public function after(): array
    {
        return [function (Validator $validator): void {
            /** @var Appointment $appointment */
            $appointment = $this->route('appointment');

            if ($validator->errors()->isNotEmpty()) {
                return;
            }

            if (! in_array($appointment->status, [AppointmentStatus::Scheduled, AppointmentStatus::Waiting], true)) {
                $validator->errors()->add('scheduled_at', "A {$appointment->status->label()} appointment cannot be moved.");

                return;
            }

            $dentistId = $this->has('dentist_id') ? $this->input('dentist_id') : $appointment->dentist_id;

            if (! $dentistId) {
                return;
            }

            $dentist = User::find($dentistId);
            $start = Carbon::parse($this->input('scheduled_at'));
            $end = $start->copy()->addMinutes($this->integer('duration_minutes') ?: $appointment->duration_minutes ?: 30);
            $scheduling = app(Scheduling::class);

            if (! $scheduling->withinWorkingHours($dentist, $start, $end)) {
                $validator->errors()->add('scheduled_at', "{$dentist->name} does not work at that time.");
            } elseif ($scheduling->conflicts($dentist, $start, $end, $appointment->id)) {
                $validator->errors()->add('scheduled_at', "{$dentist->name} already has an appointment at that time.");
            }
        }];
    }
}
