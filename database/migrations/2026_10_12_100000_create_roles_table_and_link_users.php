<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('roles', function (Blueprint $table) {
            $table->id();
            $table->string('slug')->unique();
            $table->string('name')->unique();
            $table->string('description')->nullable();
            $table->boolean('is_system')->default(false);
            $table->json('permissions')->nullable();
            $table->timestamps();
        });

        // The permission catalogue lives in code (App\Enums\Permission); roles hold
        // the subset they are granted. These are the three built-in roles.
        $everything = [
            'patients.view', 'patients.create',
            'appointments.view', 'appointments.book', 'appointments.queue', 'appointments.treat',
            'invoices.create', 'payments.record', 'finance.view',
            'prescriptions.create', 'clinical.view',
            'reports.view',
            'users.manage', 'roles.manage', 'settings.manage',
        ];

        $builtIn = [
            'admin' => [
                'System Administrator',
                'Full access, including staff accounts, roles and settings.',
                $everything,
            ],
            'receptionist' => [
                'Receptionist',
                'Front desk: patients, the schedule and queue, invoices and payments.',
                [
                    'patients.view', 'patients.create',
                    'appointments.view', 'appointments.book', 'appointments.queue',
                    'invoices.create', 'payments.record', 'finance.view',
                    'reports.view',
                ],
            ],
            'dentist' => [
                'Dentist',
                'Clinical work: own schedule, treatment, prescriptions and patient history.',
                [
                    'patients.view', 'patients.create',
                    'appointments.view', 'appointments.book', 'appointments.treat',
                    'prescriptions.create', 'clinical.view',
                ],
            ],
        ];

        $ids = [];
        foreach ($builtIn as $slug => [$name, $description, $permissions]) {
            $ids[$slug] = DB::table('roles')->insertGetId([
                'slug' => $slug,
                'name' => $name,
                'description' => $description,
                'is_system' => true,
                'permissions' => json_encode($permissions),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('role_id')->nullable()->after('password')->constrained('roles')->restrictOnDelete();
        });

        foreach ($ids as $slug => $id) {
            DB::table('users')->where('role', $slug)->update(['role_id' => $id]);
        }

        // Anything unexpected falls back to the least-privileged built-in role.
        DB::table('users')->whereNull('role_id')->update(['role_id' => $ids['receptionist']]);

        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex(['role']);
            $table->dropColumn('role');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('role')->default('receptionist')->index()->after('password');
        });

        foreach (DB::table('roles')->get(['id', 'slug']) as $role) {
            $slug = in_array($role->slug, ['admin', 'receptionist', 'dentist'], true) ? $role->slug : 'receptionist';
            DB::table('users')->where('role_id', $role->id)->update(['role' => $slug]);
        }

        Schema::table('users', function (Blueprint $table) {
            $table->dropConstrainedForeignId('role_id');
        });

        Schema::dropIfExists('roles');
    }
};
