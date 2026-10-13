<?php

namespace App\Http\Requests;

use App\Enums\InvoiceStatus;
use App\Enums\PaymentMethod;
use App\Models\Invoice;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StorePaymentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'invoice_id' => ['required', 'integer', 'exists:invoices,id'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'method' => ['required', Rule::enum(PaymentMethod::class)],
        ];
    }

    /**
     * @return array<int, callable(Validator): void>
     */
    public function after(): array
    {
        return [function (Validator $validator): void {
            $invoice = Invoice::find($this->input('invoice_id'));

            if (! $invoice || $validator->errors()->isNotEmpty()) {
                return;
            }

            if ($invoice->status === InvoiceStatus::Paid) {
                $validator->errors()->add('invoice_id', 'That invoice is already fully paid.');
            } elseif ((float) $this->input('amount') > $invoice->balance() + 0.001) {
                $validator->errors()->add(
                    'amount',
                    'The payment is more than the $'.number_format($invoice->balance(), 2).' still owed.',
                );
            }
        }];
    }
}
