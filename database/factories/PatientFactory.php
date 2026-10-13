<?php

namespace Database\Factories;

use App\Models\Consent;
use App\Models\MedicalHistory;
use App\Models\Patient;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Patient>
 */
class PatientFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->name(),
            'phone' => '+263 7'.fake()->numberBetween(1, 8).' '.fake()->numerify('### ####'),
            'email' => fake()->boolean(40) ? fake()->unique()->safeEmail() : null,
            'date_of_birth' => fake()->dateTimeBetween('-70 years', '-20 years'),
            'gender' => fake()->randomElement(['female', 'male']),
            'is_demo' => false,
        ];
    }

    public function demo(): static
    {
        return $this->state(fn (array $attributes) => ['is_demo' => true]);
    }

    /**
     * Everything the front desk needs before check-in: contact, emergency contact,
     * medical history and both required consents.
     */
    public function completeIntake(?string $allergy = null): static
    {
        return $this
            ->state(fn (array $attributes) => [
                'emergency_contact_name' => fake()->name(),
                'emergency_contact_phone' => '+263 77 '.fake()->numerify('### ####'),
                'emergency_contact_relationship' => 'Spouse',
            ])
            ->afterCreating(function (Patient $patient) use ($allergy) {
                MedicalHistory::create([
                    'patient_id' => $patient->id,
                    'allergies' => $allergy,
                    'conditions' => [],
                ]);

                foreach ([Consent::TREATMENT, Consent::PRIVACY] as $type) {
                    Consent::create([
                        'patient_id' => $patient->id,
                        'type' => $type,
                        'signed_by_name' => $patient->name,
                        'relationship' => 'self',
                        'consented_at' => now(),
                        'expires_at' => $type === Consent::TREATMENT ? now()->addYear() : null,
                    ]);
                }
            });
    }
}
