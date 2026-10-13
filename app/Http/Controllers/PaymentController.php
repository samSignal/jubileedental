<?php

namespace App\Http\Controllers;

use App\Enums\InvoiceStatus;
use App\Http\Requests\StorePaymentRequest;
use App\Models\Invoice;
use App\Models\Payment;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;

class PaymentController extends Controller
{
    public function store(StorePaymentRequest $request): RedirectResponse
    {
        $payment = DB::transaction(function () use ($request) {
            $invoice = Invoice::query()->lockForUpdate()->findOrFail($request->validated('invoice_id'));

            $payment = Payment::create([
                ...$request->validated(),
                'patient_id' => $invoice->patient_id,
                'paid_at' => now(),
                'received_by' => $request->user()->id,
            ]);

            $invoice->update([
                'status' => $invoice->balance() <= 0 ? InvoiceStatus::Paid : InvoiceStatus::Partial,
            ]);

            return $payment;
        });

        return back()->with('message', 'Payment of $'.number_format((float) $payment->amount, 2).' recorded.');
    }
}
