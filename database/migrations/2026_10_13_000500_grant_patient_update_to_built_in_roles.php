<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * New permission `patients.update` (edit profiles, record intake and consent).
     * The two clinical/front-desk built-in roles get it; custom roles are untouched.
     */
    public function up(): void
    {
        foreach (['receptionist', 'dentist'] as $slug) {
            $role = DB::table('roles')->where('slug', $slug)->first();

            if (! $role) {
                continue;
            }

            $permissions = json_decode($role->permissions ?? '[]', true) ?: [];

            if (! in_array('patients.update', $permissions, true)) {
                $permissions[] = 'patients.update';
                DB::table('roles')->where('id', $role->id)->update(['permissions' => json_encode($permissions)]);
            }
        }
    }

    public function down(): void
    {
        foreach (['receptionist', 'dentist'] as $slug) {
            $role = DB::table('roles')->where('slug', $slug)->first();

            if ($role) {
                $permissions = array_values(array_diff(json_decode($role->permissions ?? '[]', true) ?: [], ['patients.update']));
                DB::table('roles')->where('id', $role->id)->update(['permissions' => json_encode($permissions)]);
            }
        }
    }
};
