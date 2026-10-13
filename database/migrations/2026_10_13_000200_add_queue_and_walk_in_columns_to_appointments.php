<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->unsignedSmallInteger('queue_number')->nullable()->after('status');
            $table->date('queue_date')->nullable()->after('queue_number');
            $table->boolean('is_walk_in')->default(false)->after('queue_date');
            $table->boolean('intake_overridden')->default(false)->after('is_walk_in');
            $table->dateTime('ready_notified_at')->nullable()->after('intake_overridden');
            $table->unsignedSmallInteger('reschedule_count')->default(0)->after('ready_notified_at');

            // One ticket number per day.
            $table->unique(['queue_date', 'queue_number']);
        });
    }

    public function down(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->dropUnique(['queue_date', 'queue_number']);
            $table->dropColumn([
                'queue_number', 'queue_date', 'is_walk_in',
                'intake_overridden', 'ready_notified_at', 'reschedule_count',
            ]);
        });
    }
};
