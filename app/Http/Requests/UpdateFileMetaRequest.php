<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateFileMetaRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'original_name' => ['sometimes', 'string', 'max:255'],
            'folder_id' => ['sometimes', 'nullable'],
            'starred' => ['sometimes', 'boolean'],
            'trashed' => ['sometimes', 'boolean'],
        ];
    }
}
