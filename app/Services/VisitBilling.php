<?php

namespace App\Services;

use App\Enums\AppointmentStatus;
use App\Enums\InvoiceStatus;
use App\Enums\PaymentMethod;
use App\Models\Appointment;
use App\Models\AppointmentService;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Bills a visit from the services the dentist recorded and takes payment
 * against it, all on the same appointment.
 */
class VisitBilling
{
    /**
     * @return array<string, mixed>
     */
    public function summary(Appointment $appointment): array
    {
        $appointment->loadMissing(['services', 'invoice.payments']);

        $lines = $appointment->services->map(fn (AppointmentService $s) => [
            'service_id' => $s->service_id,
            'description' => $s->description,
            'quantity' => $s->quantity,
            'unit_price' => (float) $s->unit_price,
            'total' => $s->lineTotal(),
        ])->values()->all();

        $invoice = $appointment->invoice;
        $total = $invoice ? (float) $invoice->amount : round(array_sum(array_column($lines, 'total')), 2);
        $paid = $invoice ? round((float) $invoice->payments->sum('amount'), 2) : 0.0;

        return [
            'lines' => $lines,
            'total' => $total,
            'paid' => $paid,
            'balance' => max(0.0, round($total - $paid, 2)),
            'invoice_number' => $invoice?->number,
            'settled' => $invoice !== null && $paid >= $total && $total > 0,
        ];
    }

    /**
     * Save the dentist's services onto the visit (replacing earlier lines).
     *
     * @param  array<int, array{service_id?: int|null, description: string, quantity?: int, unit_price: float|int|string}>  $lines
     */
    public function recordServices(Appointment $appointment, array $lines): void
    {
        DB::transaction(function () use ($appointment, $lines) {
            $appointment->services()->delete();

            foreach ($lines as $line) {
                $appointment->services()->create([
                    'service_id' => $line['service_id'] ?? null,
                    'description' => $line['description'],
                    'quantity' => max(1, (int) ($line['quantity'] ?? 1)),
                    'unit_price' => round((float) $line['unit_price'], 2),
                ]);
            }
        });

        $appointment->unsetRelation('services');
    }

    /**
     * Create (or reuse) the visit's invoice and record a payment against it.
     *
     * @param  array<int, array<string, mixed>>|null  $lines  Replaces the visit's lines when given.
     * @return array{invoice: Invoice, payment: Payment}
     *
     * @throws ValidationException
     */
    public function collect(Appointment $appointment, User $actor, float $amount, PaymentMethod $method, ?array $lines = null): array
    {
        if ($appointment->status !== AppointmentStatus::Completed) {
            throw ValidationException::withMessages(['amount' => 'Payment is taken once the visit is finished.']);
        }

        return DB::transaction(function () use ($appointment, $actor, $amount, $method, $lines) {
            if ($lines !== null) {
                $this->recordServices($appointment, $lines);
            }

            $appointment->load(['services', 'invoice.payments']);
            $invoice = $appointment->invoice;
            $total = round((float) $appointment->services->sum(fn (AppointmentService $s) => $s->lineTotal()), 2);

            if ($invoice === null) {
                if ($total <= 0) {
                    throw ValidationException::withMessages(['lines' => 'Add at least one service to bill for this visit.']);
                }

                $invoice = Invoice::create([
                    'patient_id' => $appointment->patient_id,
                    'appointment_id' => $appointment->id,
                    'number' => Invoice::nextNumber(),
                    'description' => $appointment->services->pluck('description')->take(3)->implode(', '),
                    'amount' => $total,
                    'status' => InvoiceStatus::Unpaid,
                    'issued_at' => now(),
                    'created_by' => $actor->id,
                ]);
            } elseif ($lines !== null && $invoice->payments->isEmpty() && $total > 0) {
                // Nothing paid yet, so the bill may still be corrected.
                $invoice->update(['amount' => $total]);
            }

            $balance = $invoice->fresh()->balance();

            if ($amount <= 0) {
                throw ValidationException::withMessages(['amount' => 'Enter the amount received.']);
            }

            if ($amount > $balance + 0.001) {
                throw ValidationException::withMessages([
                    'amount' => 'That is more than the $'.number_format($balance, 2).' still owed.',
                ]);
            }

            $payment = Payment::create([
                'invoice_id' => $invoice->id,
                'patient_id' => $invoice->patient_id,
                'amount' => round($amount, 2),
                'method' => $method,
                'paid_at' => now(),
                'received_by' => $actor->id,
            ]);

            $invoice->update([
                'status' => $invoice->fresh()->balance() <= 0 ? InvoiceStatus::Paid : InvoiceStatus::Partial,
            ]);

            return ['invoice' => $invoice->fresh(), 'payment' => $payment];
        });
    }
}
