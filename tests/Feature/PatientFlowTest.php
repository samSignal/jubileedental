<?php

namespace Tests\Feature;

use App\Enums\AppointmentStatus;
use App\Models\Appointment;
use App\Models\Consent;
use App\Models\DentistSchedule;
use App\Models\Patient;
use App\Models\Role;
use App\Models\User;
use App\Notifications\PatientReadyForAssessment;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class PatientFlowTest extends TestCase
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

    protected function tearDown(): void
    {
        Carbon::setTestNow();

        parent::tearDown();
    }

    /* ------------------------------------------------ 1. search / register */

    public function test_search_finds_patients_by_name_or_phone_and_needs_two_characters(): void
    {
        $user = $this->receptionist();
        Patient::factory()->create(['name' => 'Rutendo Moyo', 'phone' => '+263 77 123 4567']);
        Patient::factory()->create(['name' => 'Tendai Ncube', 'phone' => '+263 71 999 0000']);

        $this->actingAs($user)->getJson('/patients/search?q=ruten')
            ->assertOk()->assertJsonCount(1, 'patients')->assertJsonPath('patients.0.name', 'Rutendo Moyo');

        $this->actingAs($user)->getJson('/patients/search?q=999 0000')
            ->assertOk()->assertJsonPath('patients.0.name', 'Tendai Ncube');

        $this->actingAs($user)->getJson('/patients/search?q=r')->assertOk()->assertJsonCount(0, 'patients');
    }

    public function test_search_reports_intake_status_and_todays_appointments(): void
    {
        $user = $this->receptionist();
        $patient = Patient::factory()->create(['name' => 'Chipo Dube']);
        Appointment::factory()->for($patient)->create(['scheduled_at' => now()->setTime(15, 0)]);

        $this->actingAs($user)->getJson('/patients/search?q=Chipo')
            ->assertJsonPath('patients.0.intake.complete', false)
            ->assertJsonPath('patients.0.today.0.status', 'scheduled');
    }

    public function test_reception_registers_a_new_patient_and_is_recorded_as_the_registrar(): void
    {
        $user = $this->receptionist();

        $this->actingAs($user)->postJson('/patients', [
            'name' => 'Nyasha Khumalo', 'phone' => '+263 77 000 1111', 'date_of_birth' => '1990-04-12',
        ])->assertCreated()->assertJsonPath('patient.name', 'Nyasha Khumalo');

        $this->assertDatabaseHas('patients', ['name' => 'Nyasha Khumalo', 'registered_by' => $user->id]);

        $this->actingAs($user)->postJson('/patients', ['name' => '', 'phone' => ''])
            ->assertUnprocessable()->assertJsonValidationErrors(['name', 'phone']);
    }

    public function test_patient_list_is_searchable_and_paginated(): void
    {
        Patient::factory()->count(20)->create();
        Patient::factory()->create(['name' => 'Zodwa Unique']);

        $this->actingAs($this->receptionist())->get('/patients')->assertInertia(fn (Assert $page) => $page
            ->component('Patients/Index')
            ->where('patients.total', 21)
            ->has('patients.data', 15));

        $this->actingAs($this->receptionist())->get('/patients?q=Zodwa')->assertInertia(fn (Assert $page) => $page
            ->where('patients.total', 1));
    }

    /* ------------------------------------------------ 3. intake + consent */

    public function test_a_new_patient_is_flagged_with_everything_that_is_missing(): void
    {
        $patient = Patient::factory()->create();

        $this->actingAs($this->receptionist())->getJson("/patients/{$patient->id}/summary")
            ->assertOk()
            ->assertJsonPath('patient.intake.complete', false)
            ->assertJsonFragment(['key' => 'medical_history'])
            ->assertJsonFragment(['key' => 'consent_treatment'])
            ->assertJsonFragment(['key' => 'consent_privacy']);
    }

    public function test_a_minor_also_needs_a_guardian(): void
    {
        $child = Patient::factory()->create(['date_of_birth' => now()->subYears(9)]);

        $this->actingAs($this->receptionist())->getJson("/patients/{$child->id}/summary")
            ->assertJsonFragment(['key' => 'guardian']);
    }

    public function test_saving_intake_records_details_history_and_consents_in_one_step(): void
    {
        $user = $this->receptionist();
        $patient = Patient::factory()->create();

        $this->actingAs($user)->putJson("/patients/{$patient->id}/intake", [
            'emergency_contact_name' => 'Farai Moyo',
            'emergency_contact_phone' => '+263 77 222 3333',
            'emergency_contact_relationship' => 'Brother',
            'medical_history' => [
                'allergies' => 'Penicillin',
                'conditions' => ['diabetes'],
                'is_smoker' => false,
            ],
            'consents' => [
                ['type' => 'treatment', 'signed_by_name' => $patient->name, 'relationship' => 'self'],
                ['type' => 'privacy', 'signed_by_name' => $patient->name, 'relationship' => 'self'],
            ],
        ])->assertOk()->assertJsonPath('patient.intake.complete', true);

        $patient->refresh();

        $this->assertSame('Penicillin', $patient->medicalHistory->allergies);
        $this->assertSame(2, $patient->consents()->count());
        $treatment = $patient->consents()->where('type', 'treatment')->first();
        $this->assertTrue($treatment->expires_at->between(now()->addMonths(11), now()->addMonths(13)));
        $this->assertSame($user->id, $treatment->witnessed_by);
    }

    public function test_an_existing_valid_consent_is_not_duplicated(): void
    {
        $patient = Patient::factory()->completeIntake()->create();

        $this->actingAs($this->receptionist())->putJson("/patients/{$patient->id}/intake", [
            'consents' => [['type' => 'treatment', 'signed_by_name' => 'X', 'relationship' => 'self']],
        ])->assertOk();

        $this->assertSame(1, $patient->consents()->where('type', 'treatment')->count());
    }

    public function test_an_expired_or_withdrawn_consent_puts_the_patient_back_on_the_missing_list(): void
    {
        $patient = Patient::factory()->completeIntake()->create();
        $patient->consents()->where('type', Consent::TREATMENT)->update(['expires_at' => now()->subDay()]);

        $this->actingAs($this->receptionist())->getJson("/patients/{$patient->id}/summary")
            ->assertJsonFragment(['key' => 'consent_treatment']);

        $privacy = $patient->consents()->where('type', Consent::PRIVACY)->first();
        $this->actingAs($this->receptionist())->patchJson("/consents/{$privacy->id}/revoke")->assertOk();

        $this->actingAs($this->receptionist())->getJson("/patients/{$patient->id}/summary")
            ->assertJsonFragment(['key' => 'consent_privacy']);
    }

    public function test_medical_alerts_reach_clinicians_but_not_the_front_desk(): void
    {
        $patient = Patient::factory()->completeIntake('Penicillin')->create();

        $this->actingAs($this->receptionist())->getJson("/patients/{$patient->id}/summary")
            ->assertJsonMissingPath('patient.alerts');

        $this->actingAs($this->dentist())->getJson("/patients/{$patient->id}/summary")
            ->assertJsonPath('patient.alerts.0', 'Allergy: Penicillin');
    }

    public function test_the_profile_withholds_medical_history_from_roles_without_clinical_access(): void
    {
        $patient = Patient::factory()->completeIntake('Latex')->create();

        $this->actingAs($this->receptionist())->get("/patients/{$patient->id}")->assertInertia(fn (Assert $page) => $page
            ->where('history', null)
            ->where('historyRecorded', true)
            ->where('can.clinical', false));

        $this->actingAs($this->dentist())->get("/patients/{$patient->id}")->assertInertia(fn (Assert $page) => $page
            ->where('history.allergies', 'Latex')
            ->where('finance', null));
    }

    /* ------------------------------------------------ 2. booking / walk-in */

    public function test_booking_is_limited_to_the_dentists_working_hours(): void
    {
        $dentist = $this->dentist();
        $patient = Patient::factory()->create();
        $monday = now()->next(Carbon::MONDAY);

        DentistSchedule::create(['user_id' => $dentist->id, 'weekday' => 1, 'start_time' => '08:00', 'end_time' => '12:00']);

        $book = fn (string $time) => $this->actingAs($this->receptionist())->postJson('/appointments', [
            'patient_id' => $patient->id, 'dentist_id' => $dentist->id, 'procedure' => 'Checkup',
            'scheduled_at' => $monday->format('Y-m-d').' '.$time, 'duration_minutes' => 30,
        ]);

        $book('10:00')->assertCreated();
        $book('13:00')->assertUnprocessable()->assertJsonValidationErrors('scheduled_at');
        $book('11:45')->assertUnprocessable(); // would run past 12:00
    }

    public function test_double_booking_a_dentist_is_refused_but_back_to_back_is_fine(): void
    {
        $dentist = $this->dentist();
        $patient = Patient::factory()->create();
        $day = now()->addDays(2)->format('Y-m-d');

        $book = fn (string $time) => $this->actingAs($this->receptionist())->postJson('/appointments', [
            'patient_id' => $patient->id, 'dentist_id' => $dentist->id, 'procedure' => 'Filling',
            'scheduled_at' => "{$day} {$time}", 'duration_minutes' => 30,
        ]);

        $book('09:00')->assertCreated();
        $book('09:15')->assertUnprocessable()->assertJsonValidationErrors('scheduled_at');
        $book('09:30')->assertCreated();
    }

    public function test_availability_lists_free_slots_and_skips_booked_ones(): void
    {
        $dentist = $this->dentist();
        $day = now()->addDays(3);
        $date = $day->format('Y-m-d');

        if ($day->isSunday()) {
            $day = $day->addDay();
            $date = $day->format('Y-m-d');
        }

        DentistSchedule::create(['user_id' => $dentist->id, 'weekday' => $day->dayOfWeek, 'start_time' => '09:00', 'end_time' => '11:00']);
        Appointment::factory()->create([
            'dentist_id' => $dentist->id, 'scheduled_at' => "{$date} 09:30:00", 'duration_minutes' => 30,
        ]);

        $times = collect($this->actingAs($this->receptionist())
            ->getJson("/appointments/availability?dentist_id={$dentist->id}&date={$date}&duration=30")
            ->assertOk()->assertJsonPath('configured', true)->json('slots'))->pluck('time');

        $this->assertTrue($times->contains('09:00'));
        $this->assertFalse($times->contains('09:30'));
        $this->assertFalse($times->contains('09:15'));   // would overlap the 09:30 booking
        $this->assertTrue($times->contains('10:00'));
        $this->assertFalse($times->contains('11:00'));   // ends after closing
    }

    public function test_a_walk_in_becomes_an_appointment_for_right_now(): void
    {
        $dentist = $this->dentist();
        $patient = Patient::factory()->create();

        $this->actingAs($this->receptionist())->postJson('/appointments/walk-in', [
            'patient_id' => $patient->id, 'dentist_id' => $dentist->id, 'procedure' => 'Toothache',
        ])->assertCreated()->assertJsonPath('appointment.is_walk_in', true)->assertJsonPath('appointment.status', 'scheduled');

        $appointment = Appointment::firstOrFail();
        $this->assertTrue($appointment->scheduled_at->isToday());
        $this->assertTrue($appointment->is_walk_in);
    }

    public function test_an_appointment_can_be_rescheduled(): void
    {
        $dentist = $this->dentist();
        $appointment = Appointment::factory()->create([
            'dentist_id' => $dentist->id, 'scheduled_at' => now()->addDay()->setTime(10, 0),
        ]);
        $newTime = now()->addDays(2)->setTime(14, 0);

        $this->actingAs($this->receptionist())->patchJson("/appointments/{$appointment->id}/reschedule", [
            'scheduled_at' => $newTime->toDateTimeString(),
        ])->assertOk();

        $appointment->refresh();
        $this->assertTrue($appointment->scheduled_at->equalTo($newTime));
        $this->assertSame(1, $appointment->reschedule_count);
    }

    public function test_rescheduling_respects_conflicts_and_finished_visits(): void
    {
        $dentist = $this->dentist();
        $when = now()->addDays(2)->setTime(10, 0);
        Appointment::factory()->create(['dentist_id' => $dentist->id, 'scheduled_at' => $when]);
        $moving = Appointment::factory()->create(['dentist_id' => $dentist->id, 'scheduled_at' => now()->addDays(3)->setTime(9, 0)]);
        $done = Appointment::factory()->status(AppointmentStatus::Completed)->create();

        $this->actingAs($this->receptionist())->patchJson("/appointments/{$moving->id}/reschedule", [
            'scheduled_at' => $when->toDateTimeString(),
        ])->assertUnprocessable()->assertJsonValidationErrors('scheduled_at');

        $this->actingAs($this->receptionist())->patchJson("/appointments/{$done->id}/reschedule", [
            'scheduled_at' => now()->addDay()->toDateTimeString(),
        ])->assertUnprocessable();
    }

    /* ------------------------------------------------ 4. check-in / queue */

    public function test_checking_in_issues_sequential_queue_numbers_and_an_arrival_time(): void
    {
        $user = $this->receptionist();
        $a = Appointment::factory()->for(Patient::factory()->completeIntake())->create(['scheduled_at' => now()->setTime(9, 0)]);
        $b = Appointment::factory()->for(Patient::factory()->completeIntake())->create(['scheduled_at' => now()->setTime(9, 30)]);

        $this->actingAs($user)->postJson("/appointments/{$a->id}/check-in")
            ->assertOk()
            ->assertJsonPath('appointment.queue_number', 1)
            ->assertJsonPath('appointment.queue_label', 'Q-001')
            ->assertJsonPath('appointment.status', 'waiting');

        $this->actingAs($user)->postJson("/appointments/{$b->id}/check-in")
            ->assertJsonPath('appointment.queue_number', 2);

        $this->assertNotNull($a->fresh()->checked_in_at);
    }

    public function test_queue_numbers_start_again_each_day(): void
    {
        $user = $this->receptionist();

        Carbon::setTestNow(Carbon::parse('2026-11-02 09:00'));
        $monday = Appointment::factory()->for(Patient::factory()->completeIntake())->create(['scheduled_at' => now()]);
        $this->actingAs($user)->postJson("/appointments/{$monday->id}/check-in")->assertJsonPath('appointment.queue_number', 1);

        Carbon::setTestNow(Carbon::parse('2026-11-03 09:00'));
        $tuesday = Appointment::factory()->for(Patient::factory()->completeIntake())->create(['scheduled_at' => now()]);
        $this->actingAs($user)->postJson("/appointments/{$tuesday->id}/check-in")->assertJsonPath('appointment.queue_number', 1);
    }

    public function test_check_in_never_blocks_on_paperwork_but_flags_what_is_pending(): void
    {
        $dentist = $this->dentist();
        $appointment = Appointment::factory()->for(Patient::factory())->create(['dentist_id' => $dentist->id]);

        $this->actingAs($this->receptionist())->postJson("/appointments/{$appointment->id}/check-in")
            ->assertOk()
            ->assertJsonPath('appointment.status', 'waiting')
            ->assertJsonPath('appointment.queue_label', 'Q-001')
            ->assertJsonPath('appointment.consent_pending', true)
            ->assertJsonPath('appointment.history_status', 'missing');

        $this->assertTrue($appointment->fresh()->intake_overridden);

        // The dentist is told, with the same flags.
        $data = $dentist->notifications()->first()->data;
        $this->assertTrue($data['consent_pending']);
        $this->assertSame('missing', $data['history_status']);
    }

    public function test_consent_can_be_recorded_in_the_same_step_as_check_in(): void
    {
        $patient = Patient::factory()->create(['name' => 'Chipo Dube']);
        $appointment = Appointment::factory()->for($patient)->create();

        $this->actingAs($this->receptionist())->postJson("/appointments/{$appointment->id}/check-in", [
            'consent' => ['signed_by_name' => 'Chipo Dube', 'relationship' => 'self'],
        ])->assertOk()->assertJsonPath('appointment.consent_pending', false);

        $this->assertSame(2, $patient->consents()->count());
        $this->assertFalse($appointment->fresh()->intake_overridden);
    }

    public function test_a_valid_consent_is_not_asked_for_again_at_the_next_visit(): void
    {
        $patient = Patient::factory()->completeIntake()->create();
        $first = Appointment::factory()->for($patient)->create();
        $user = $this->receptionist();

        $this->actingAs($user)->postJson("/appointments/{$first->id}/check-in")->assertOk();
        $first->update(['status' => AppointmentStatus::Completed]);

        $second = Appointment::factory()->for($patient)->create(['scheduled_at' => now()->setTime(16, 0)]);
        $this->actingAs($user)->postJson("/appointments/{$second->id}/check-in")
            ->assertOk()->assertJsonPath('appointment.consent_pending', false);

        $this->assertSame(2, $patient->consents()->count());
    }

    public function test_an_old_medical_history_is_flagged_for_review(): void
    {
        $patient = Patient::factory()->completeIntake()->create();
        $patient->medicalHistory->forceFill(['updated_at' => now()->subMonths(14)])->saveQuietly();

        $this->actingAs($this->receptionist())->getJson("/patients/{$patient->id}/summary")
            ->assertJsonPath('patient.history_status', 'outdated')
            ->assertJsonPath('patient.intake.complete', false);
    }

    public function test_a_walk_in_goes_straight_into_the_queue_in_one_step(): void
    {
        $dentist = $this->dentist();
        $patient = Patient::factory()->completeIntake()->create();

        $this->actingAs($this->receptionist())->postJson('/appointments/walk-in', [
            'patient_id' => $patient->id, 'dentist_id' => $dentist->id, 'procedure' => 'Toothache', 'check_in' => true,
        ])->assertCreated()
            ->assertJsonPath('appointment.status', 'waiting')
            ->assertJsonPath('appointment.queue_label', 'Q-001')
            ->assertJsonPath('appointment.is_walk_in', true);

        $this->assertCount(1, $dentist->notifications);
    }

    public function test_a_patient_cannot_be_checked_in_twice(): void
    {
        $appointment = Appointment::factory()->for(Patient::factory()->completeIntake())->create();
        $user = $this->receptionist();

        $this->actingAs($user)->postJson("/appointments/{$appointment->id}/check-in")->assertOk();
        $this->actingAs($user)->postJson("/appointments/{$appointment->id}/check-in")->assertUnprocessable();
    }

    /* ------------------------------------------------ 5. notify dentist */

    public function test_the_assigned_dentist_is_notified_with_queue_number_and_alerts(): void
    {
        $dentist = $this->dentist();
        $other = $this->dentist();
        $appointment = Appointment::factory()
            ->for(Patient::factory()->completeIntake('Penicillin'))
            ->create(['dentist_id' => $dentist->id, 'procedure' => 'Root Canal']);

        $this->actingAs($this->receptionist())->postJson("/appointments/{$appointment->id}/check-in")
            ->assertOk()->assertJsonPath('notified.0', $dentist->name);

        $this->assertCount(1, $dentist->notifications);
        $this->assertCount(0, $other->notifications);

        $data = $dentist->notifications->first()->data;
        $this->assertSame('patient_ready', $data['kind']);
        $this->assertSame(1, $data['queue_number']);
        $this->assertSame(['Allergy: Penicillin'], $data['alerts']);
        $this->assertStringContainsString('Q-001', $data['title']);
        $this->assertSame(PatientReadyForAssessment::class, $dentist->notifications->first()->type);
    }

    public function test_an_unassigned_patient_notifies_every_dentist_on_duty(): void
    {
        $one = $this->dentist();
        $two = $this->dentist();
        $appointment = Appointment::factory()->for(Patient::factory()->completeIntake())->create(['dentist_id' => null]);

        $this->actingAs($this->receptionist())->postJson("/appointments/{$appointment->id}/check-in")->assertOk();

        $this->assertCount(1, $one->notifications);
        $this->assertCount(1, $two->notifications);
    }

    public function test_the_dentist_can_be_reminded_and_notifications_can_be_read(): void
    {
        $dentist = $this->dentist();
        $appointment = Appointment::factory()->for(Patient::factory()->completeIntake())->create(['dentist_id' => $dentist->id]);
        $receptionist = $this->receptionist();

        $this->actingAs($receptionist)->postJson("/appointments/{$appointment->id}/check-in")->assertOk();
        $this->actingAs($receptionist)->postJson("/appointments/{$appointment->id}/notify")->assertOk();

        $this->assertCount(2, $dentist->fresh()->notifications);

        $this->actingAs($dentist)->get('/dashboard')->assertInertia(fn (Assert $page) => $page
            ->where('notifications.unread', 2));

        $this->actingAs($dentist)->post('/notifications/read')->assertRedirect();

        $this->assertSame(0, $dentist->fresh()->unreadNotifications()->count());
    }

    public function test_only_waiting_patients_can_be_announced(): void
    {
        $appointment = Appointment::factory()->create();

        $this->actingAs($this->receptionist())->postJson("/appointments/{$appointment->id}/notify")->assertStatus(422);
    }

    public function test_admins_are_only_listed_as_practitioners_once_they_have_working_hours(): void
    {
        $dentist = $this->dentist();
        $admin = User::factory()->role('admin')->create();
        $receptionist = $this->receptionist();

        $names = fn () => User::query()->practitioners()->pluck('id')->all();

        $this->assertContains($dentist->id, $names());
        $this->assertNotContains($admin->id, $names());
        $this->assertNotContains($receptionist->id, $names());

        DentistSchedule::create(['user_id' => $admin->id, 'weekday' => 1, 'start_time' => '09:00', 'end_time' => '12:00']);

        $this->assertContains($admin->id, $names());
    }

    /* ------------------------------------------------ permissions + schedules */

    public function test_check_in_and_treatment_stay_with_their_own_roles(): void
    {
        $appointment = Appointment::factory()->for(Patient::factory()->completeIntake())->create();

        $this->actingAs($this->dentist())->postJson("/appointments/{$appointment->id}/check-in")->assertForbidden();
        $this->actingAs($this->dentist())->get('/front-desk')->assertForbidden();
        $this->actingAs($this->receptionist())->get('/front-desk')->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('FrontDesk/Index')->has('rows')->has('stats')->has('services'));
    }

    public function test_a_role_without_booking_access_cannot_create_walk_ins_or_appointments(): void
    {
        $viewer = Role::create([
            'slug' => 'viewer', 'name' => 'Viewer', 'is_system' => false,
            'permissions' => ['patients.view', 'appointments.view'],
        ]);
        $user = User::factory()->role($viewer)->create();
        $patient = Patient::factory()->create();

        $this->actingAs($user)->postJson('/appointments/walk-in', ['patient_id' => $patient->id, 'procedure' => 'X'])->assertForbidden();
        $this->actingAs($user)->postJson('/patients', ['name' => 'N', 'phone' => '1'])->assertForbidden();
        $this->actingAs($user)->putJson("/patients/{$patient->id}/intake", [])->assertForbidden();
    }

    public function test_only_administrators_manage_dentist_schedules(): void
    {
        $dentist = $this->dentist();
        $payload = ['blocks' => [['weekday' => 1, 'start' => '08:00', 'end' => '12:00'], ['weekday' => 1, 'start' => '13:00', 'end' => '17:00']]];

        $this->actingAs($this->receptionist())->put("/admin/schedules/{$dentist->id}", $payload)->assertForbidden();

        $this->actingAs(User::factory()->role('admin')->create())
            ->put("/admin/schedules/{$dentist->id}", $payload)->assertSessionHasNoErrors();

        $this->assertSame(2, DentistSchedule::where('user_id', $dentist->id)->count());
    }

    public function test_schedule_blocks_cannot_overlap_or_run_backwards(): void
    {
        $admin = User::factory()->role('admin')->create();
        $dentist = $this->dentist();

        $this->actingAs($admin)->put("/admin/schedules/{$dentist->id}", [
            'blocks' => [['weekday' => 2, 'start' => '08:00', 'end' => '12:00'], ['weekday' => 2, 'start' => '11:00', 'end' => '15:00']],
        ])->assertSessionHasErrors('blocks');

        $this->actingAs($admin)->put("/admin/schedules/{$dentist->id}", [
            'blocks' => [['weekday' => 2, 'start' => '12:00', 'end' => '09:00']],
        ])->assertSessionHasErrors('blocks');
    }

    public function test_schedules_are_only_for_people_who_can_treat(): void
    {
        $admin = User::factory()->role('admin')->create();
        $receptionist = $this->receptionist();

        $this->actingAs($admin)->put("/admin/schedules/{$receptionist->id}", ['blocks' => []])->assertNotFound();
    }
}
