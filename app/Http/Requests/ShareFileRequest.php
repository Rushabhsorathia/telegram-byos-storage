<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ShareFileRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'password' => ['nullable', 'string', 'min:4', 'max:255'],
            'expires_at' => ['nullable', 'date', 'after:now'],
            'max_downloads' => ['nullable', 'integer', 'min:1'],
        ];
    }
}
