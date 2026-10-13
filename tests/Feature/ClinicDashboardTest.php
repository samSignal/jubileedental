<?php

namespace Tests\Feature;

use App\Enums\AppointmentStatus;
use App\Enums\InvoiceStatus;
use App\Models\Appointment;
use App\Models\Invoice;
use App\Models\Patient;
use App\Models\Payment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class ClinicDashboardTest extends TestCase
{
    use RefreshDatabase;

    private function stat(Assert $page, string $key): array
    {
        $stats = collect($page->toArray()['props']['stats'])->keyBy('key');

        return $stats[$key];
    }

    public function test_an_empty_clinic_shows_zeroes_and_no_invented_records(): void
    {
        $admin = User::factory()->role('admin')->create();

        $this->actingAs($admin)->get('/dashboard')->assertInertia(fn (Assert $page) => $page
            ->component('Dashboard')
            ->where('stats.0.value', 0)
            ->where('stats.1.value', 0)
            ->where('stats.2.value', 0)
            ->where('stats.3.value', 0)
            ->where('timeline', [])
            ->where('activity', [])
            ->where('recentPatients', [])
            ->where('hasDemoRecords', false));
    }

    public function test_figures_come_from_the_database(): void
    {
        $admin = User::factory()->role('admin')->create();
        $patient = Patient::factory()->create();
        Appointment::factory()->for($patient)->count(2)->create(['scheduled_at' => now()->setTime(15, 0)]);
        $invoice = Invoice::factory()->for($patient)->create(['amount' => 100]);
        Payment::factory()->create(['invoice_id' => $invoice->id, 'amount' => 40, 'paid_at' => now()]);

        $this->actingAs($admin)->get('/dashboard')->assertInertia(fn (Assert $page) => $page
            ->where('stats.0.value', 1)           // total patients
            ->where('stats.1.value', 2)           // today's appointments
            ->where('stats.2.value', 40)          // revenue today
            ->where('stats.3.value', 60)          // outstanding balance
            ->has('timeline', 2)
            ->where('series.range', 7));
    }

    public function test_a_dentist_sees_only_their_own_and_unassigned_appointments(): void
    {
        $dentist = User::factory()->role('dentist')->create();
        $other = User::factory()->role('dentist')->create();
        $slot = ['scheduled_at' => now()->setTime(14, 0)];

        Appointment::factory()->create([...$slot, 'dentist_id' => $dentist->id]);
        Appointment::factory()->create([...$slot, 'dentist_id' => null]);
        Appointment::factory()->create([...$slot, 'dentist_id' => $other->id]);

        $this->actingAs($dentist)->get('/dashboard')->assertInertia(fn (Assert $page) => $page
            ->has('timeline', 2)
            ->where('can.seesRevenue', false)
            ->where('series.metric', 'patients'));
    }

    public function test_the_queue_flags_late_arrivals(): void
    {
        $admin = User::factory()->role('admin')->create();
        Appointment::factory()->create(['scheduled_at' => now()->subMinutes(30)]);
        Appointment::factory()->status(AppointmentStatus::Waiting)->create([
            'scheduled_at' => now()->subMinutes(20),
            'checked_in_at' => now()->subMinutes(15),
        ]);

        $this->actingAs($admin)->get('/dashboard')->assertInertia(fn (Assert $page) => $page
            ->where('queue.waiting', 1)
            ->where('queue.overdue', 1)
            ->where('queue.longest_wait', 15));
    }

    public function test_the_front_desk_checks_patients_in_but_cannot_start_treatment(): void
    {
        $receptionist = User::factory()->role('receptionist')->create();
        $appointment = Appointment::factory()->for(Patient::factory()->completeIntake())->create();

        $this->actingAs($receptionist)
            ->patch("/appointments/{$appointment->id}/status", ['status' => 'waiting'])
            ->assertSessionHasNoErrors();

        $this->assertSame(AppointmentStatus::Waiting, $appointment->fresh()->status);
        $this->assertNotNull($appointment->fresh()->checked_in_at);

        $this->actingAs($receptionist)
            ->patch("/appointments/{$appointment->id}/status", ['status' => 'in_progress'])
            ->assertForbidden();
    }

    public function test_a_dentist_runs_treatment_but_cannot_check_patients_in(): void
    {
        $dentist = User::factory()->role('dentist')->create();
        $waiting = Appointment::factory()->status(AppointmentStatus::Waiting)->create();
        $scheduled = Appointment::factory()->create();

        $this->actingAs($dentist)
            ->patch("/appointments/{$waiting->id}/status", ['status' => 'in_progress'])
            ->assertSessionHasNoErrors();
        $this->actingAs($dentist)
            ->patch("/appointments/{$waiting->id}/status", ['status' => 'completed'])
            ->assertSessionHasNoErrors();

        $this->assertSame(AppointmentStatus::Completed, $waiting->fresh()->status);

        $this->actingAs($dentist)
            ->patch("/appointments/{$scheduled->id}/status", ['status' => 'waiting'])
            ->assertForbidden();
    }

    public function test_impossible_status_jumps_are_rejected(): void
    {
        $admin = User::factory()->role('admin')->create();
        $appointment = Appointment::factory()->create();

        $this->actingAs($admin)
            ->patch("/appointments/{$appointment->id}/status", ['status' => 'completed'])
            ->assertSessionHasErrors('status');

        $this->assertSame(AppointmentStatus::Scheduled, $appointment->fresh()->status);
    }

    public function test_payments_update_the_invoice_and_cannot_exceed_the_balance(): void
    {
        $receptionist = User::factory()->role('receptionist')->create();
        $invoice = Invoice::factory()->create(['amount' => 100]);

        $this->actingAs($receptionist)->post('/payments', [
            'invoice_id' => $invoice->id, 'amount' => 30, 'method' => 'cash',
        ])->assertSessionHasNoErrors();
        $this->assertSame(InvoiceStatus::Partial, $invoice->fresh()->status);

        $this->actingAs($receptionist)->post('/payments', [
            'invoice_id' => $invoice->id, 'amount' => 90, 'method' => 'cash',
        ])->assertSessionHasErrors('amount');

        $this->actingAs($receptionist)->post('/payments', [
            'invoice_id' => $invoice->id, 'amount' => 70, 'method' => 'card',
        ])->assertSessionHasNoErrors();

        $this->assertSame(InvoiceStatus::Paid, $invoice->fresh()->status);
        $this->assertSame($receptionist->id, Payment::latest('id')->first()->received_by);
    }

    public function test_quick_actions_are_limited_to_the_roles_that_perform_them(): void
    {
        $dentist = User::factory()->role('dentist')->create();
        $receptionist = User::factory()->role('receptionist')->create();
        $patient = Patient::factory()->create();
        $invoice = Invoice::factory()->create(['amount' => 50]);

        // The front desk cannot prescribe.
        $this->actingAs($receptionist)->post('/prescriptions', [
            'patient_id' => $patient->id, 'medication' => 'Amoxicillin',
        ])->assertForbidden();

        // Dentists do not handle money.
        $this->actingAs($dentist)->post('/payments', [
            'invoice_id' => $invoice->id, 'amount' => 10, 'method' => 'cash',
        ])->assertForbidden();
        $this->actingAs($dentist)->post('/invoices', [
            'patient_id' => $patient->id, 'description' => 'Filling', 'amount' => 40,
        ])->assertForbidden();

        $this->actingAs($receptionist)->post('/patients', [
            'name' => 'Rudo Chirwa', 'phone' => '+263 77 111 2222',
        ])->assertSessionHasNoErrors();

        $this->assertDatabaseHas('patients', ['name' => 'Rudo Chirwa', 'is_demo' => false]);
    }

    public function test_an_appointment_can_only_be_assigned_to_a_dentist(): void
    {
        $receptionist = User::factory()->role('receptionist')->create();
        $notADentist = User::factory()->role('receptionist')->create();
        $patient = Patient::factory()->create();

        $this->actingAs($receptionist)->post('/appointments', [
            'patient_id' => $patient->id,
            'dentist_id' => $notADentist->id,
            'procedure' => 'Checkup',
            'scheduled_at' => now()->addDay()->toDateTimeString(),
        ])->assertSessionHasErrors('dentist_id');
    }

    public function test_the_revenue_range_is_selectable(): void
    {
        $admin = User::factory()->role('admin')->create();

        $this->actingAs($admin)->get('/dashboard?range=30')->assertInertia(fn (Assert $page) => $page
            ->where('series.range', 30)
            ->has('series.points', 30));

        $this->actingAs($admin)->get('/dashboard?range=999')->assertInertia(fn (Assert $page) => $page
            ->where('series.range', 7));
    }
}
