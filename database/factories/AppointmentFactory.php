<?php

namespace Database\Factories;

use App\Enums\AppointmentStatus;
use App\Models\Appointment;
use App\Models\Patient;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Appointment>
 */
class AppointmentFactory extends Factory
{
    /** @var array<int, string> */
    public const PROCEDURES = [
        'Checkup', 'Cleaning', 'Filling', 'Root Canal', 'Extraction',
        'Consultation', 'Whitening', 'Crown Fitting',
    ];

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'patient_id' => Patient::factory(),
            'procedure' => fake()->randomElement(self::PROCEDURES),
            'scheduled_at' => now()->setTime(fake()->numberBetween(8, 16), fake()->randomElement([0, 30])),
            'duration_minutes' => fake()->randomElement([30, 45, 60]),
            'status' => AppointmentStatus::Scheduled,
        ];
    }

    public function status(AppointmentStatus $status): static
    {
        return $this->state(fn (array $attributes) => ['status' => $status]);
    }
}
