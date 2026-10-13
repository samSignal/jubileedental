<?php

namespace Database\Factories;

use App\Models\Patient;
use App\Models\Prescription;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Prescription>
 */
class PrescriptionFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'patient_id' => Patient::factory(),
            'medication' => fake()->randomElement(['Amoxicillin 500mg', 'Ibuprofen 400mg', 'Paracetamol 500mg', 'Chlorhexidine rinse']),
            'dosage' => fake()->randomElement(['1 tablet, 3 times daily', '1 tablet when needed', 'Rinse twice daily']),
            'issued_at' => now(),
        ];
    }
}
