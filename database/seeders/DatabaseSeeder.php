<?php

namespace Database\Seeders;

use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed one demo account per built-in role plus sample clinic records.
     * Local/testing only: these use a known password and demo data.
     * (The roles themselves are created by a migration.)
     */
    public function run(): void
    {
        if (app()->isProduction()) {
            return;
        }

        foreach (Role::where('is_system', true)->get() as $role) {
            User::factory()->role($role)->create([
                'name' => $role->name,
                'username' => $role->slug,
                'email' => $role->slug.'@jubilee-dental.test',
            ]);
        }

        $this->call(DemoClinicSeeder::class);
    }
}
