<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class CompleteVisitRequest extends FormRequest
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
            'services' => ['nullable', 'array', 'max:20'],
            'services.*.service_id' => ['nullable', 'integer', 'exists:services,id'],
            'services.*.description' => ['required', 'string', 'max:160'],
            'services.*.quantity' => ['nullable', 'integer', 'min:1', 'max:99'],
            'services.*.unit_price' => ['required', 'numeric', 'min:0', 'max:100000'],
        ];
    }
}
