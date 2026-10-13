<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('services', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->decimal('price', 10, 2);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // The price list the dentist picks from and reception bills against.
        // Editable under Admin > Services & prices.
        $defaults = [
            ['Consultation', 25], ['Checkup', 30], ['Cleaning', 45], ['X-ray', 20],
            ['Filling', 60], ['Extraction', 80], ['Whitening', 120], ['Root canal', 150], ['Crown', 200],
        ];

        foreach ($defaults as [$name, $price]) {
            DB::table('services')->insert([
                'name' => $name, 'price' => $price, 'is_active' => true,
                'created_at' => now(), 'updated_at' => now(),
            ]);
        }

        Schema::create('appointment_services', function (Blueprint $table) {
            $table->id();
            $table->foreignId('appointment_id')->constrained()->cascadeOnDelete();
            $table->foreignId('service_id')->nullable()->constrained()->nullOnDelete();
            $table->string('description');
            $table->unsignedSmallInteger('quantity')->default(1);
            $table->decimal('unit_price', 10, 2);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('appointment_services');
        Schema::dropIfExists('services');
    }
};
