<?php

namespace Database\Seeders;

use App\Enums\AppointmentStatus;
use App\Enums\InvoiceStatus;
use App\Enums\PaymentMethod;
use App\Models\Appointment;
use App\Models\Consent;
use App\Models\DentistSchedule;
use App\Models\Invoice;
use App\Models\MedicalHistory;
use App\Models\Patient;
use App\Models\Payment;
use App\Models\Prescription;
use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * Development-only demo clinic. Every patient is flagged `is_demo`, so the
 * dashboard can tell staff the figures are sample data. Never runs in production.
 */
class DemoClinicSeeder extends Seeder
{
    public function run(): void
    {
        if (app()->isProduction() || Patient::where('is_demo', true)->exists()) {
            return;
        }

        $dentist = User::whereHas('role', fn ($q) => $q->where('slug', 'dentist'))->first();

        // Working hours: Mon-Fri with lunch, Saturday morning.
        if ($dentist) {
            foreach ([1, 2, 3, 4, 5] as $weekday) {
                DentistSchedule::create(['user_id' => $dentist->id, 'weekday' => $weekday, 'start_time' => '08:00', 'end_time' => '13:00']);
                DentistSchedule::create(['user_id' => $dentist->id, 'weekday' => $weekday, 'start_time' => '14:00', 'end_time' => '17:00']);
            }
            DentistSchedule::create(['user_id' => $dentist->id, 'weekday' => 6, 'start_time' => '08:00', 'end_time' => '12:00']);
        }

        $patients = Patient::factory()->demo()->count(36)->create();

        // Most patients have a full intake on file; a few are deliberately incomplete
        // so the "missing items" flags have something to show.
        $allergies = ['Penicillin', null, null, 'Latex', null, 'Ibuprofen', null, null];

        foreach ($patients as $i => $patient) {
            if ($i >= 28) {
                continue; // incomplete intake
            }

            $patient->update([
                'emergency_contact_name' => fake()->name(),
                'emergency_contact_phone' => '+263 77 '.fake()->numerify('### ####'),
                'emergency_contact_relationship' => ['Spouse', 'Parent', 'Sibling', 'Friend'][$i % 4],
            ]);

            MedicalHistory::create([
                'patient_id' => $patient->id,
                'allergies' => $allergies[$i % count($allergies)],
                'conditions' => $i % 7 === 0 ? ['hypertension'] : ($i % 11 === 0 ? ['diabetes'] : []),
                'is_smoker' => $i % 5 === 0,
                'last_dental_visit' => now()->subMonths(random_int(2, 18)),
                'recorded_by' => $dentist?->id,
            ]);

            foreach ([Consent::TREATMENT, Consent::PRIVACY] as $type) {
                Consent::create([
                    'patient_id' => $patient->id,
                    'type' => $type,
                    'signed_by_name' => $patient->name,
                    'relationship' => 'self',
                    'consented_at' => now()->subDays(random_int(5, 200)),
                    'expires_at' => $type === Consent::TREATMENT ? now()->addMonths(random_int(2, 11)) : null,
                ]);
            }
        }

        $ready = $patients->take(28);
        $procedures = ['Checkup', 'Cleaning', 'Filling', 'Root Canal', 'Extraction', 'Consultation', 'Whitening'];
        $prices = [30, 45, 60, 80, 120, 150];

        // Last four weeks: completed visits, mostly paid.
        foreach (range(28, 1) as $daysAgo) {
            $day = now()->subDays($daysAgo);

            if ($day->isSunday()) {
                continue;
            }

            foreach (range(1, random_int(3, 7)) as $slot) {
                $patient = $patients->random();
                $procedure = $procedures[array_rand($procedures)];
                $at = $day->copy()->setTime(7 + $slot + random_int(0, 1), [0, 30][random_int(0, 1)]);

                $appointment = Appointment::create([
                    'patient_id' => $patient->id,
                    'dentist_id' => $dentist?->id,
                    'procedure' => $procedure,
                    'scheduled_at' => $at,
                    'status' => AppointmentStatus::Completed,
                    'checked_in_at' => $at->copy()->subMinutes(10),
                    'started_at' => $at,
                    'completed_at' => $at->copy()->addMinutes(40),
                ]);

                $this->billVisit($appointment, $procedure, $prices[array_rand($prices)], $at->copy()->addMinutes(45), paid: random_int(1, 10) > 2);
            }
        }

        // Today: a realistic queue relative to the current time. People who have
        // already arrived are drawn from patients with complete intake.
        $now = now();
        $today = [
            [-150, AppointmentStatus::Completed, 'Cleaning', false],
            [-90, AppointmentStatus::Completed, 'Checkup', false],
            [-40, AppointmentStatus::InProgress, 'Filling', false],
            [-20, AppointmentStatus::Waiting, 'Root Canal', false],
            [-25, AppointmentStatus::Scheduled, 'Consultation', false],  // running late
            [30, AppointmentStatus::Scheduled, 'Extraction', false],
            [75, AppointmentStatus::Scheduled, 'Whitening', false],
            [120, AppointmentStatus::Scheduled, 'Checkup', true],        // intake not finished
        ];

        $queueNumber = 0;
        $pool = $ready->shuffle()->values();
        $incomplete = $patients->slice(28)->values();

        foreach ($today as $i => [$offset, $status, $procedure, $useIncomplete]) {
            $at = $now->copy()->addMinutes($offset)->second(0)->minute((int) (round($now->copy()->addMinutes($offset)->minute / 15) * 15) % 60);
            $arrived = in_array($status, [AppointmentStatus::Waiting, AppointmentStatus::InProgress, AppointmentStatus::Completed], true);

            $appointment = Appointment::create([
                'patient_id' => ($useIncomplete ? $incomplete->random() : $pool[$i])->id,
                'dentist_id' => $dentist?->id,
                'procedure' => $procedure,
                'scheduled_at' => $at,
                'status' => $status,
                'queue_number' => $arrived ? ++$queueNumber : null,
                'queue_date' => $arrived ? now()->toDateString() : null,
                'checked_in_at' => $arrived ? $at->copy()->subMinutes(8) : null,
                'ready_notified_at' => $arrived ? $at->copy()->subMinutes(8) : null,
                'started_at' => in_array($status, [AppointmentStatus::InProgress, AppointmentStatus::Completed], true) ? $at : null,
                'completed_at' => $status === AppointmentStatus::Completed ? $at->copy()->addMinutes(35) : null,
            ]);

            if ($status === AppointmentStatus::Completed) {
                $price = $prices[array_rand($prices)];

                // The dentist recorded what was done. The first visit is waiting at the
                // desk to be paid; the second has already been settled.
                $appointment->services()->create(['description' => $procedure, 'quantity' => 1, 'unit_price' => $price]);

                if ($i === 1) {
                    $this->billVisit($appointment, $procedure, $price, $at->copy()->addMinutes(40), paid: true);
                }
            }
        }

        // One walk-in who has already been checked in.
        $walkIn = $pool[10] ?? $pool->first();
        Appointment::create([
            'patient_id' => $walkIn->id,
            'dentist_id' => $dentist?->id,
            'procedure' => 'Toothache',
            'scheduled_at' => $now->copy()->subMinutes(12)->second(0),
            'status' => AppointmentStatus::Waiting,
            'is_walk_in' => true,
            'queue_number' => ++$queueNumber,
            'queue_date' => now()->toDateString(),
            'checked_in_at' => $now->copy()->subMinutes(10),
            'ready_notified_at' => $now->copy()->subMinutes(10),
        ]);

        // Upcoming follow-ups.
        foreach (range(1, 8) as $i) {
            Appointment::create([
                'patient_id' => $patients->random()->id,
                'dentist_id' => $dentist?->id,
                'procedure' => $procedures[array_rand($procedures)],
                'scheduled_at' => now()->addDays($i + random_int(0, 2))->setTime(8 + random_int(0, 8), [0, 30][random_int(0, 1)]),
                'status' => AppointmentStatus::Scheduled,
            ]);
        }

        // A few prescriptions today.
        Prescription::factory()->count(3)->state(fn () => [
            'patient_id' => $patients->random()->id,
            'dentist_id' => $dentist?->id,
        ])->create();
    }

    private function billVisit(Appointment $appointment, string $procedure, int $amount, \DateTimeInterface $paidAt, bool $paid): void
    {
        $invoice = Invoice::create([
            'patient_id' => $appointment->patient_id,
            'appointment_id' => $appointment->id,
            'number' => Invoice::nextNumber(),
            'description' => $procedure,
            'amount' => $amount,
            'status' => $paid ? InvoiceStatus::Paid : InvoiceStatus::Unpaid,
            'issued_at' => $appointment->scheduled_at,
        ]);

        if ($paid) {
            Payment::create([
                'invoice_id' => $invoice->id,
                'patient_id' => $invoice->patient_id,
                'amount' => $amount,
                'method' => collect(PaymentMethod::cases())->random(),
                'paid_at' => $paidAt,
            ]);
        }
    }
}
