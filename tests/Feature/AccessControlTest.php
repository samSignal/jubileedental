<?php

namespace Tests\Feature;

use App\Enums\Permission;
use App\Models\Appointment;
use App\Models\Invoice;
use App\Models\Patient;
use App\Models\Payment;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Inertia\Testing\AssertableInertia as Assert;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class AccessControlTest extends TestCase
{
    use RefreshDatabase;

    private function customRole(array $permissions, string $name = 'Nurse'): Role
    {
        return Role::create([
            'slug' => str($name)->slug('_')->toString(),
            'name' => $name,
            'is_system' => false,
            'permissions' => $permissions,
        ]);
    }

    /**
     * @return array<string, array{0: string, 1: Permission, 2: bool}>
     */
    public static function permissionMatrix(): array
    {
        return [
            'admin manages users' => ['admin', Permission::UsersManage, true],
            'admin manages roles' => ['admin', Permission::RolesManage, true],
            'admin treats patients' => ['admin', Permission::AppointmentsTreat, true],
            'receptionist records payments' => ['receptionist', Permission::PaymentsRecord, true],
            'receptionist runs the queue' => ['receptionist', Permission::AppointmentsQueue, true],
            'receptionist cannot treat' => ['receptionist', Permission::AppointmentsTreat, false],
            'receptionist cannot prescribe' => ['receptionist', Permission::PrescriptionsCreate, false],
            'receptionist cannot manage users' => ['receptionist', Permission::UsersManage, false],
            'dentist treats' => ['dentist', Permission::AppointmentsTreat, true],
            'dentist prescribes' => ['dentist', Permission::PrescriptionsCreate, true],
            'dentist cannot take payments' => ['dentist', Permission::PaymentsRecord, false],
            'dentist cannot see finances' => ['dentist', Permission::FinanceView, false],
            'dentist cannot manage roles' => ['dentist', Permission::RolesManage, false],
        ];
    }

    #[DataProvider('permissionMatrix')]
    public function test_the_built_in_permission_matrix(string $role, Permission $permission, bool $allowed): void
    {
        $user = User::factory()->role($role)->create();

        $this->assertSame($allowed, $user->can($permission->value));
    }

    public function test_the_three_built_in_roles_exist_and_are_protected(): void
    {
        $this->assertEqualsCanonicalizing(
            ['admin', 'receptionist', 'dentist'],
            Role::where('is_system', true)->pluck('slug')->all(),
        );
    }

    public function test_a_deactivated_account_holds_no_permissions(): void
    {
        $user = User::factory()->role('admin')->inactive()->create();

        $this->assertFalse($user->can('users.manage'));
        $this->assertSame([], $user->permissionValues());
    }

    public function test_only_people_who_can_manage_users_open_the_users_list(): void
    {
        $this->actingAs(User::factory()->role('receptionist')->create())->get('/admin/users')->assertForbidden();
        $this->actingAs(User::factory()->role('dentist')->create())->get('/admin/users')->assertForbidden();

        $this->actingAs(User::factory()->role('admin')->create())
            ->get('/admin/users')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('Users/Index')->has('roles', 3)->has('users'));
    }

    public function test_only_people_who_can_manage_roles_open_the_roles_page(): void
    {
        $this->actingAs(User::factory()->role('receptionist')->create())->get('/admin/roles')->assertForbidden();

        $this->actingAs(User::factory()->role('admin')->create())
            ->get('/admin/roles')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('Roles/Index')->has('roles', 3)->has('catalogue'));
    }

    /* ---------------------------------------------------------- dynamic roles */

    public function test_an_administrator_creates_a_role_with_chosen_permissions(): void
    {
        $admin = User::factory()->role('admin')->create();

        $this->actingAs($admin)->post('/admin/roles', [
            'name' => 'Dental Nurse',
            'description' => 'Assists the dentist.',
            'permissions' => ['patients.view', 'appointments.view', 'clinical.view'],
        ])->assertSessionHasNoErrors();

        $role = Role::where('name', 'Dental Nurse')->firstOrFail();

        $this->assertSame('dental_nurse', $role->slug);
        $this->assertFalse($role->is_system);
        $this->assertTrue($role->grants(Permission::ClinicalView));
        $this->assertFalse($role->grants(Permission::PaymentsRecord));
    }

    public function test_role_input_is_validated(): void
    {
        $admin = User::factory()->role('admin')->create();

        $this->actingAs($admin)->post('/admin/roles', [
            'name' => 'Dentist', // already taken
            'permissions' => ['patients.view', 'launch.missiles'],
        ])->assertSessionHasErrors(['name', 'permissions.1']);
    }

    public function test_editing_a_role_changes_what_its_members_can_do_immediately(): void
    {
        $admin = User::factory()->role('admin')->create();
        $nurse = $this->customRole(['patients.view']);
        $member = User::factory()->role($nurse)->create();

        $this->assertFalse($member->fresh()->can('payments.record'));

        $this->actingAs($admin)->patch("/admin/roles/{$nurse->id}", [
            'name' => 'Nurse',
            'description' => null,
            'permissions' => ['patients.view', 'payments.record'],
        ])->assertSessionHasNoErrors();

        $this->assertTrue($member->fresh()->can('payments.record'));
    }

    public function test_the_administrator_role_cannot_be_changed_or_deleted(): void
    {
        $admin = User::factory()->role('admin')->create();
        $role = Role::where('slug', 'admin')->firstOrFail();

        $this->actingAs($admin)->patch("/admin/roles/{$role->id}", [
            'name' => 'Admin', 'permissions' => [],
        ])->assertSessionHasErrors('name');

        $this->actingAs($admin)->delete("/admin/roles/{$role->id}")->assertSessionHasErrors('role');

        $this->assertCount(count(Permission::cases()), $role->fresh()->permissionValues());
    }

    public function test_built_in_roles_can_be_tuned_but_not_deleted(): void
    {
        $admin = User::factory()->role('admin')->create();
        $receptionist = Role::where('slug', 'receptionist')->firstOrFail();

        $this->actingAs($admin)->patch("/admin/roles/{$receptionist->id}", [
            'name' => 'Receptionist',
            'permissions' => ['patients.view', 'appointments.view'],
        ])->assertSessionHasNoErrors();

        $this->assertFalse($receptionist->fresh()->grants(Permission::PaymentsRecord));

        $this->actingAs($admin)->delete("/admin/roles/{$receptionist->id}")->assertSessionHasErrors('role');
        $this->assertNotNull($receptionist->fresh());
    }

    public function test_a_role_with_members_cannot_be_deleted_but_an_empty_one_can(): void
    {
        $admin = User::factory()->role('admin')->create();
        $used = $this->customRole(['patients.view'], 'Used Role');
        $empty = $this->customRole(['patients.view'], 'Empty Role');
        User::factory()->role($used)->create();

        $this->actingAs($admin)->delete("/admin/roles/{$used->id}")->assertSessionHasErrors('role');
        $this->assertNotNull($used->fresh());

        $this->actingAs($admin)->delete("/admin/roles/{$empty->id}")->assertSessionHasNoErrors();
        $this->assertNull($empty->fresh());
    }

    public function test_someone_cannot_remove_their_own_access_to_manage_roles(): void
    {
        $manager = $this->customRole(['roles.manage', 'users.manage', 'patients.view'], 'Office Manager');
        $user = User::factory()->role($manager)->create();

        $this->actingAs($user)->patch("/admin/roles/{$manager->id}", [
            'name' => 'Office Manager',
            'permissions' => ['patients.view'],
        ])->assertSessionHasErrors('permissions');

        $this->assertTrue($manager->fresh()->grants(Permission::RolesManage));
    }

    public function test_a_custom_role_gets_exactly_the_access_it_was_given(): void
    {
        $biller = $this->customRole(['patients.view', 'finance.view', 'payments.record'], 'Biller');
        $user = User::factory()->role($biller)->create();
        $invoice = Invoice::factory()->create(['amount' => 40]);

        // Allowed: take a payment.
        $this->actingAs($user)->post('/payments', [
            'invoice_id' => $invoice->id, 'amount' => 40, 'method' => 'cash',
        ])->assertSessionHasNoErrors();

        // Not allowed: anything outside the role.
        $this->actingAs($user)->post('/prescriptions', [
            'patient_id' => Patient::factory()->create()->id, 'medication' => 'X',
        ])->assertForbidden();
        $this->actingAs($user)->get('/admin/users')->assertForbidden();
    }

    public function test_a_dentist_style_custom_role_can_be_assigned_appointments(): void
    {
        $locum = $this->customRole(['appointments.view', 'appointments.treat', 'patients.view'], 'Locum');
        $locumUser = User::factory()->role($locum)->create();
        $receptionist = User::factory()->role('receptionist')->create();
        $nurse = User::factory()->role($this->customRole(['patients.view'], 'Observer'))->create();
        $patient = Patient::factory()->create();
        $when = now()->addDay()->toDateTimeString();

        $this->actingAs($receptionist)->post('/appointments', [
            'patient_id' => $patient->id, 'dentist_id' => $locumUser->id, 'procedure' => 'Checkup', 'scheduled_at' => $when,
        ])->assertSessionHasNoErrors();

        $this->actingAs($receptionist)->post('/appointments', [
            'patient_id' => $patient->id, 'dentist_id' => $nurse->id, 'procedure' => 'Checkup', 'scheduled_at' => $when,
        ])->assertSessionHasErrors('dentist_id');
    }

    /* ----------------------------------------- server-side data withholding */

    public function test_finance_data_is_not_sent_to_roles_without_finance_access(): void
    {
        $dentist = User::factory()->role('dentist')->create();
        $invoice = Invoice::factory()->create(['amount' => 100]);
        Payment::factory()->create(['invoice_id' => $invoice->id, 'amount' => 25, 'paid_at' => now()]);
        Appointment::factory()->create(['scheduled_at' => now()->setTime(15, 0)]);

        $this->actingAs($dentist)->get('/dashboard')->assertInertia(fn (Assert $page) => $page
            ->where('outstanding.count', 0)
            ->where('outstanding.invoices', [])
            ->where('series.metric', 'patients')
            ->where('view', 'clinician')
            ->where('stats.0.key', 'mine'));

        $props = $this->actingAs($dentist)->get('/dashboard')->viewData('page')['props'];

        $this->assertStringNotContainsString('Payment received', json_encode($props['activity']));
    }

    public function test_a_role_with_no_clinical_access_gets_no_patient_lists(): void
    {
        $viewer = User::factory()->role($this->customRole(['reports.view'], 'Auditor'))->create();
        Patient::factory()->count(3)->create();

        $this->actingAs($viewer)->get('/dashboard')->assertInertia(fn (Assert $page) => $page
            ->where('recentPatients', [])
            ->where('timeline', [])
            ->where('options.patients', []));
    }

    /* ---------------------------------------------------------- user admin */

    public function test_an_administrator_creates_a_staff_account_with_a_temporary_password(): void
    {
        $admin = User::factory()->role('admin')->create();
        $roleId = Role::where('slug', 'dentist')->value('id');

        $this->actingAs($admin)->post('/admin/users', [
            'name' => 'Tendai Moyo',
            'username' => 'Tendai.Moyo',
            'email' => 'Tendai@Clinic.test',
            'role_id' => $roleId,
            'password' => 'Temp-Pass-2026',
        ])->assertSessionHasNoErrors();

        $created = User::where('username', 'tendai.moyo')->firstOrFail();

        $this->assertSame('dentist', $created->role->slug);
        $this->assertSame('tendai@clinic.test', $created->email);
        $this->assertTrue($created->is_active);
        $this->assertTrue($created->must_change_password);
        $this->assertTrue(Hash::check('Temp-Pass-2026', $created->password));
    }

    public function test_staff_creation_is_validated(): void
    {
        $admin = User::factory()->role('admin')->create();
        $existing = User::factory()->create(['username' => 'taken']);

        $this->actingAs($admin)->post('/admin/users', [
            'name' => 'X', 'username' => 'taken', 'email' => $existing->email,
            'role_id' => 9999, 'password' => 'short',
        ])->assertSessionHasErrors(['username', 'email', 'role_id', 'password']);
    }

    public function test_a_new_account_must_choose_its_own_password_before_anything_else(): void
    {
        $user = User::factory()->role('dentist')->create(['must_change_password' => true]);

        $this->actingAs($user)->get('/dashboard')->assertRedirect('/profile');
        $this->actingAs($user)->get('/profile')->assertOk();

        $this->actingAs($user)->put('/password', [
            'current_password' => 'password',
            'password' => 'brand-new-secret',
            'password_confirmation' => 'brand-new-secret',
        ])->assertSessionHasNoErrors();

        $this->assertFalse($user->fresh()->must_change_password);
        $this->actingAs($user->fresh())->get('/dashboard')->assertOk();
    }

    public function test_administrators_cannot_lock_themselves_out(): void
    {
        $admin = User::factory()->role('admin')->create();
        $dentistRole = Role::where('slug', 'dentist')->value('id');

        $this->actingAs($admin)->patch("/admin/users/{$admin->id}", [
            'name' => $admin->name, 'email' => $admin->email, 'role_id' => $dentistRole, 'is_active' => true,
        ])->assertSessionHasErrors('role_id');

        $this->actingAs($admin)->patch("/admin/users/{$admin->id}", [
            'name' => $admin->name, 'email' => $admin->email, 'role_id' => $admin->role_id, 'is_active' => false,
        ])->assertSessionHasErrors('role_id');

        $this->assertSame('admin', $admin->fresh()->role->slug);
        $this->assertTrue($admin->fresh()->is_active);
    }

    public function test_the_last_person_who_can_manage_accounts_cannot_be_removed(): void
    {
        $manager = $this->customRole(['users.manage'], 'Account Manager');
        $actor = User::factory()->role($manager)->create();
        $lastAdmin = User::factory()->role('admin')->create();
        $receptionist = Role::where('slug', 'receptionist')->value('id');

        // Two people can manage accounts, so demoting one is allowed.
        $this->actingAs($actor)->patch("/admin/users/{$lastAdmin->id}", [
            'name' => $lastAdmin->name, 'email' => $lastAdmin->email, 'role_id' => $receptionist, 'is_active' => true,
        ])->assertSessionHasNoErrors();

        // Now the actor is the only one left: another account manager may not demote them.
        $second = User::factory()->role($manager)->create();
        $this->actingAs($second)->patch("/admin/users/{$actor->id}", [
            'name' => $actor->name, 'email' => $actor->email, 'role_id' => $receptionist, 'is_active' => true,
        ])->assertSessionHasNoErrors();

        // Only $second can manage accounts now; they cannot remove themselves.
        $this->actingAs($second)->patch("/admin/users/{$second->id}", [
            'name' => $second->name, 'email' => $second->email, 'role_id' => $receptionist, 'is_active' => true,
        ])->assertSessionHasErrors('role_id');
    }

    public function test_deactivating_someone_signs_them_out_immediately(): void
    {
        config(['session.driver' => 'database']);

        $admin = User::factory()->role('admin')->create();
        $dentist = User::factory()->role('dentist')->create();

        DB::table('sessions')->insert([
            'id' => 'abc', 'user_id' => $dentist->id, 'ip_address' => '127.0.0.1',
            'user_agent' => 'test', 'payload' => '', 'last_activity' => time(),
        ]);

        $this->actingAs($admin)->patch("/admin/users/{$dentist->id}", [
            'name' => $dentist->name, 'email' => $dentist->email, 'role_id' => $dentist->role_id, 'is_active' => false,
        ])->assertSessionHasNoErrors();

        $this->assertDatabaseMissing('sessions', ['id' => 'abc']);
        $this->assertFalse($dentist->fresh()->is_active);
    }

    public function test_a_deactivated_user_is_logged_out_mid_session(): void
    {
        $user = User::factory()->role('receptionist')->inactive()->create();

        $this->actingAs($user)->get('/dashboard')->assertRedirect('/login');

        $this->assertGuest();
    }

    public function test_resetting_a_password_forces_a_change_and_ends_sessions(): void
    {
        config(['session.driver' => 'database']);

        $admin = User::factory()->role('admin')->create();
        $dentist = User::factory()->role('dentist')->create();

        DB::table('sessions')->insert([
            'id' => 'xyz', 'user_id' => $dentist->id, 'ip_address' => '127.0.0.1',
            'user_agent' => 'test', 'payload' => '', 'last_activity' => time(),
        ]);

        $this->actingAs($admin)->put("/admin/users/{$dentist->id}/password", [
            'password' => 'Fresh-Temp-2026',
        ])->assertSessionHasNoErrors();

        $dentist->refresh();

        $this->assertTrue($dentist->must_change_password);
        $this->assertTrue(Hash::check('Fresh-Temp-2026', $dentist->password));
        $this->assertDatabaseMissing('sessions', ['id' => 'xyz']);
    }

    public function test_the_last_login_is_recorded(): void
    {
        $user = User::factory()->role('dentist')->create(['username' => 'dr.moyo']);

        $this->assertNull($user->last_login_at);

        $this->post('/login', ['login' => 'DR.Moyo', 'password' => 'password'])->assertRedirect('/dashboard');

        $this->assertNotNull($user->fresh()->last_login_at);
        $this->assertNotNull($user->fresh()->last_login_ip);
    }
}
