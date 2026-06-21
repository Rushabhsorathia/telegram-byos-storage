<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class InitiateFileUploadRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'storage_connection_id' => ['required', 'integer', 'exists:storage_connections,id'],
            'original_name' => ['required', 'string', 'max:255'],
            'size_bytes' => ['required', 'integer', 'min:1'],
            'mime_type' => ['nullable', 'string', 'max:255'],
            'checksum_sha256' => ['nullable', 'string', 'max:128'],
            'encryption_iv' => ['nullable', 'string'],
            'encryption_tag' => ['nullable', 'string'],
            'encrypted_key' => ['nullable', 'string'],
            'key_metadata' => ['nullable', 'string'],
        ];
    }
}
