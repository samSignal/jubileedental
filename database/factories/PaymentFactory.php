<?php

namespace Database\Factories;

use App\Enums\PaymentMethod;
use App\Models\Invoice;
use App\Models\Payment;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Payment>
 */
class PaymentFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'invoice_id' => Invoice::factory(),
            'patient_id' => fn (array $attributes) => Invoice::find($attributes['invoice_id'])->patient_id,
            'amount' => fake()->randomElement([30, 45, 60, 80, 120]),
            'method' => fake()->randomElement(PaymentMethod::cases()),
            'paid_at' => now(),
        ];
    }
}
