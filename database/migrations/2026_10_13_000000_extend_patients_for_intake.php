<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('patients', function (Blueprint $table) {
            $table->string('address')->nullable()->after('gender');
            $table->string('national_id', 32)->nullable()->after('address')->index();
            $table->string('emergency_contact_name')->nullable()->after('national_id');
            $table->string('emergency_contact_phone', 32)->nullable()->after('emergency_contact_name');
            $table->string('emergency_contact_relationship', 40)->nullable()->after('emergency_contact_phone');
            $table->string('guardian_name')->nullable()->after('emergency_contact_relationship');
            $table->string('guardian_phone', 32)->nullable()->after('guardian_name');
            $table->string('medical_aid_provider')->nullable()->after('guardian_phone');
            $table->string('medical_aid_number', 64)->nullable()->after('medical_aid_provider');
            $table->foreignId('registered_by')->nullable()->after('is_demo')->constrained('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('patients', function (Blueprint $table) {
            $table->dropConstrainedForeignId('registered_by');
            $table->dropIndex(['national_id']);
            $table->dropColumn([
                'address', 'national_id', 'emergency_contact_name', 'emergency_contact_phone',
                'emergency_contact_relationship', 'guardian_name', 'guardian_phone',
                'medical_aid_provider', 'medical_aid_number',
            ]);
        });
    }
};
