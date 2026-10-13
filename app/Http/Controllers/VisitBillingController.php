<?php

namespace App\Http\Controllers;

use App\Enums\AppointmentStatus;
use App\Enums\PaymentMethod;
use App\Http\Requests\CollectPaymentRequest;
use App\Http\Requests\CompleteVisitRequest;
use App\Models\Appointment;
use App\Services\VisitBilling;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;

class VisitBillingController extends Controller
{
    public function __construct(private readonly VisitBilling $billing) {}

    /**
     * The dentist finishes the visit and records what was done, so reception can
     * bill exactly that. Recording services is optional.
     */
    public function complete(CompleteVisitRequest $request, Appointment $appointment): JsonResponse|RedirectResponse
    {
        if (! $appointment->status->canMoveTo(AppointmentStatus::Completed)) {
            return $request->wantsJson()
                ? response()->json(['message' => "That visit is already {$appointment->status->label()}."], 422)
                : back()->withErrors(['status' => "That visit is already {$appointment->status->label()}."]);
        }

        if ($request->has('services')) {
            $this->billing->recordServices($appointment, $request->validated('services') ?? []);
        }

        $appointment->update(['status' => AppointmentStatus::Completed, 'completed_at' => now()]);

        if ($request->wantsJson()) {
            return response()->json(['billing' => $this->billing->summary($appointment->fresh())]);
        }

        return back()->with('message', "{$appointment->patient->name}: visit completed and sent to reception for payment.");
    }

    /**
     * Reception takes payment for the visit: invoice and payment in one step.
     */
    public function pay(CollectPaymentRequest $request, Appointment $appointment): JsonResponse|RedirectResponse
    {
        $result = $this->billing->collect(
            $appointment,
            $request->user(),
            (float) $request->validated('amount'),
            PaymentMethod::from($request->validated('method')),
            $request->has('lines') ? ($request->validated('lines') ?? []) : null,
        );

        $summary = $this->billing->summary($appointment->fresh());

        if ($request->wantsJson()) {
            return response()->json([
                'billing' => $summary,
                'receipt' => [
                    'invoice_number' => $result['invoice']->number,
                    'amount' => (float) $result['payment']->amount,
                    'method' => $result['payment']->method->label(),
                    'balance' => $summary['balance'],
                    'patient' => $appointment->patient->name,
                ],
            ]);
        }

        return back()->with('message', 'Payment of $'.number_format((float) $result['payment']->amount, 2).' recorded.');
    }
}
