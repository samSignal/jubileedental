<?php

namespace App\Http\Controllers;

use App\Http\Requests\StorePrescriptionRequest;
use App\Models\Prescription;
use Illuminate\Http\RedirectResponse;

class PrescriptionController extends Controller
{
    public function store(StorePrescriptionRequest $request): RedirectResponse
    {
        $prescription = Prescription::create([
            ...$request->validated(),
            'dentist_id' => $request->user()->id,
            'issued_at' => now(),
        ]);

        return back()->with('message', "Prescription for {$prescription->patient->name} created.");
    }
}
