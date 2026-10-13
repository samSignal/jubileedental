<?php

namespace App\Http\Controllers;

use App\Enums\InvoiceStatus;
use App\Http\Requests\StoreInvoiceRequest;
use App\Models\Invoice;
use Illuminate\Http\RedirectResponse;

class InvoiceController extends Controller
{
    public function store(StoreInvoiceRequest $request): RedirectResponse
    {
        $invoice = Invoice::create([
            ...$request->validated(),
            'number' => Invoice::nextNumber(),
            'status' => InvoiceStatus::Unpaid,
            'issued_at' => now(),
            'created_by' => $request->user()->id,
        ]);

        return back()->with('message', "Invoice {$invoice->number} created.");
    }
}
