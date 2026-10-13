<?php

namespace Database\Factories;

use App\Enums\InvoiceStatus;
use App\Models\Invoice;
use App\Models\Patient;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Invoice>
 */
class InvoiceFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'patient_id' => Patient::factory(),
            'number' => 'INV-'.fake()->unique()->numerify('######'),
            'description' => fake()->randomElement(['Checkup', 'Cleaning', 'Filling', 'Root Canal', 'Extraction']),
            'amount' => fake()->randomElement([30, 45, 60, 80, 120, 150, 250]),
            'status' => InvoiceStatus::Unpaid,
            'issued_at' => now(),
        ];
    }
}
