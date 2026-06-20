<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreMasterKeyRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'master_key_salt' => ['required', 'string', 'max:255'],
            'master_key_verifier' => ['required', 'string'],
        ];
    }
}
