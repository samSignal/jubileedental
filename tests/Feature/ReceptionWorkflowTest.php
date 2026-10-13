<?php

namespace Tests\Feature;

use App\Models\Appointment;
use App\Models\Invoice;
use App\Models\Patient;
use App\Models\Payment;
use App\Models\Service;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class ReceptionWorkflowTest extends TestCase
{
    use RefreshDatabase;

    private function receptionist(): User
    {
        return User::factory()->role('receptionist')->create();
    }

    private function dentist(): User
    {
        return User::factory()->role('dentist')->create();
    }

    private function inTreatment(User $dentist): Appointment
    {
        return Appointment::factory()
            ->for(Patient::factory()->completeIntake())
            ->status(\App\Enums\AppointmentStatus::InProgress)
            ->create(['dentist_id' => $dentist->id, 'scheduled_at' => now()->subMinutes(30)]);
    }

    public function test_the_receptionists_home_is_the_reception_screen(): void
    {
        $this->actingAs($this->receptionist())->get('/dashboard')->assertRedirect('/front-desk');
        $this->actingAs(User::factory()->role('admin')->create())->get('/dashboard')->assertOk();
        $this->actingAs($this->dentist())->get('/dashboard')->assertOk();
    }

    public function test_the_reception_screen_is_one_list_with_the_days_numbers(): void
    {
        $dentist = $this->dentist();
        Appointment::factory()->for(Patient::factory()->completeIntake())->count(2)->create([
            'dentist_id' => $dentist->id, 'scheduled_at' => now()->setTime(15, 0),
        ]);
        Appointment::factory()->status(\App\Enums\AppointmentStatus::Waiting)->create([
            'queue_number' => 1, 'queue_date' => now()->toDateString(), 'checked_in_at' => now()->subMinutes(5),
            'scheduled_at' => now()->setTime(14, 0),
        ]);

        $this->actingAs($this->receptionist())->get('/front-desk')->assertInertia(fn (Assert $page) => $page
            ->component('FrontDesk/Index')
            ->has('rows', 3)
            ->where('stats.appointments', 3)
            ->where('stats.waiting', 1)
            ->where('stats.collected', 0));
    }

    public function test_the_dentist_records_services_when_finishing_a_visit(): void
    {
        $dentist = $this->dentist();
        $visit = $this->inTreatment($dentist);
        $filling = Service::where('name', 'Filling')->firstOrFail();

        $this->actingAs($dentist)->postJson("/appointments/{$visit->id}/complete", [
            'services' => [
                ['service_id' => $filling->id, 'description' => 'Filling', 'quantity' => 2, 'unit_price' => 60],
                ['description' => 'X-ray', 'quantity' => 1, 'unit_price' => 20],
            ],
        ])->assertOk()->assertJsonPath('billing.total', 140)->assertJsonPath('billing.balance', 140);

        $this->assertSame(\App\Enums\AppointmentStatus::Completed, $visit->fresh()->status);
        $this->assertCount(2, $visit->services);
    }

    public function test_only_people_who_treat_can_finish_a_visit_and_it_must_be_in_progress(): void
    {
        $dentist = $this->dentist();
        $visit = $this->inTreatment($dentist);
        $waiting = Appointment::factory()->status(\App\Enums\AppointmentStatus::Waiting)->create();

        $this->actingAs($this->receptionist())->postJson("/appointments/{$visit->id}/complete")->assertForbidden();
        $this->actingAs($dentist)->postJson("/appointments/{$waiting->id}/complete")->assertUnprocessable();
    }

    public function test_reception_collects_payment_for_exactly_what_the_dentist_recorded(): void
    {
        $dentist = $this->dentist();
        $reception = $this->receptionist();
        $visit = $this->inTreatment($dentist);

        $this->actingAs($dentist)->postJson("/appointments/{$visit->id}/complete", [
            'services' => [['description' => 'Cleaning', 'quantity' => 1, 'unit_price' => 45], ['description' => 'Checkup', 'quantity' => 1, 'unit_price' => 30]],
        ])->assertOk();

        $this->actingAs($reception)->postJson("/appointments/{$visit->id}/payment", [
            'amount' => 75, 'method' => 'cash',
        ])->assertOk()
            ->assertJsonPath('receipt.amount', 75)
            ->assertJsonPath('receipt.balance', 0)
            ->assertJsonPath('billing.settled', true);

        $invoice = Invoice::where('appointment_id', $visit->id)->firstOrFail();
        $this->assertSame('paid', $invoice->status->value);
        $this->assertSame(75.0, (float) $invoice->amount);
        $this->assertSame($reception->id, Payment::firstOrFail()->received_by);
    }

    public function test_a_part_payment_leaves_a_balance_and_overpaying_is_refused(): void
    {
        $dentist = $this->dentist();
        $reception = $this->receptionist();
        $visit = $this->inTreatment($dentist);
        $this->actingAs($dentist)->postJson("/appointments/{$visit->id}/complete", [
            'services' => [['description' => 'Root canal', 'quantity' => 1, 'unit_price' => 150]],
        ])->assertOk();

        $this->actingAs($reception)->postJson("/appointments/{$visit->id}/payment", ['amount' => 200, 'method' => 'card'])
            ->assertUnprocessable()->assertJsonValidationErrors('amount');

        $this->actingAs($reception)->postJson("/appointments/{$visit->id}/payment", ['amount' => 100, 'method' => 'mobile_money'])
            ->assertOk()->assertJsonPath('receipt.balance', 50)->assertJsonPath('billing.settled', false);

        $this->actingAs($reception)->postJson("/appointments/{$visit->id}/payment", ['amount' => 50, 'method' => 'cash'])
            ->assertOk()->assertJsonPath('billing.settled', true);
    }

    public function test_the_cashier_can_correct_the_lines_before_taking_payment(): void
    {
        $dentist = $this->dentist();
        $visit = $this->inTreatment($dentist);
        $this->actingAs($dentist)->postJson("/appointments/{$visit->id}/complete", [])->assertOk();

        // No services were recorded, so reception adds them while billing.
        $this->actingAs($this->receptionist())->postJson("/appointments/{$visit->id}/payment", [
            'amount' => 30,
            'method' => 'cash',
            'lines' => [['description' => 'Checkup', 'quantity' => 1, 'unit_price' => 30]],
        ])->assertOk()->assertJsonPath('billing.total', 30);
    }

    public function test_a_visit_with_nothing_to_bill_cannot_take_payment(): void
    {
        $visit = Appointment::factory()->status(\App\Enums\AppointmentStatus::Completed)->create();

        $this->actingAs($this->receptionist())->postJson("/appointments/{$visit->id}/payment", [
            'amount' => 10, 'method' => 'cash',
        ])->assertUnprocessable();
    }

    public function test_payment_is_only_for_roles_that_take_money(): void
    {
        $visit = Appointment::factory()->status(\App\Enums\AppointmentStatus::Completed)->create();

        $this->actingAs($this->dentist())->postJson("/appointments/{$visit->id}/payment", [
            'amount' => 10, 'method' => 'cash',
        ])->assertForbidden();
    }

    public function test_the_ready_to_pay_list_and_collected_total_come_from_real_payments(): void
    {
        $dentist = $this->dentist();
        $reception = $this->receptionist();
        $paid = $this->inTreatment($dentist);
        $owing = $this->inTreatment($dentist);

        foreach ([$paid, $owing] as $visit) {
            $this->actingAs($dentist)->postJson("/appointments/{$visit->id}/complete", [
                'services' => [['description' => 'Filling', 'quantity' => 1, 'unit_price' => 60]],
            ])->assertOk();
        }

        $this->actingAs($reception)->postJson("/appointments/{$paid->id}/payment", ['amount' => 60, 'method' => 'cash'])->assertOk();

        $this->actingAs($reception)->get('/front-desk')->assertInertia(fn (Assert $page) => $page
            ->where('stats.collected', 60)
            ->where('stats.to_collect', 1));
    }

    public function test_the_price_list_is_readable_by_staff_and_editable_only_by_administrators(): void
    {
        $this->actingAs($this->dentist())->getJson('/services')->assertOk()->assertJsonFragment(['name' => 'Filling']);

        $service = Service::where('name', 'Filling')->firstOrFail();
        $payload = ['name' => 'Filling', 'price' => 70, 'is_active' => true];

        $this->actingAs($this->receptionist())->patch("/admin/services/{$service->id}", $payload)->assertForbidden();
        $this->actingAs(User::factory()->role('admin')->create())->patch("/admin/services/{$service->id}", $payload)
            ->assertSessionHasNoErrors();

        $this->assertSame(70.0, (float) $service->fresh()->price);
    }
}
