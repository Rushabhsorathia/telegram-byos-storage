<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreStorageConnectionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'bot_token' => ['required', 'string', 'min:10'],
            'chat_id' => ['required', 'string'],
            'chat_title' => ['nullable', 'string', 'max:255'],
            'label' => ['nullable', 'string', 'max:255'],
        ];
    }
}
