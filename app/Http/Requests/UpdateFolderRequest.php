<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateFolderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'string', 'max:255'],
            'parent_id' => ['sometimes', 'nullable'],
            'color' => ['sometimes', 'nullable', 'string', 'max:20'],
            'trashed' => ['sometimes', 'boolean'],
        ];
    }
}
