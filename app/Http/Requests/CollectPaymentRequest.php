<?php

namespace App\Http\Requests;

use App\Enums\PaymentMethod;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CollectPaymentRequest extends FormRequest
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
            'amount' => ['required', 'numeric', 'min:0.01'],
            'method' => ['required', Rule::enum(PaymentMethod::class)],
            'lines' => ['nullable', 'array', 'max:20'],
            'lines.*.service_id' => ['nullable', 'integer', 'exists:services,id'],
            'lines.*.description' => ['required', 'string', 'max:160'],
            'lines.*.quantity' => ['nullable', 'integer', 'min:1', 'max:99'],
            'lines.*.unit_price' => ['required', 'numeric', 'min:0', 'max:100000'],
        ];
    }
}
