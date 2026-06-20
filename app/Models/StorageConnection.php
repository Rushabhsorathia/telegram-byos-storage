<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class StorageConnection extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id', 'label', 'bot_username', 'bot_token',
        'chat_id', 'chat_title', 'status', 'last_error', 'verified_at',
    ];

    protected $hidden = ['bot_token'];

    protected function casts(): array
    {
        return [
            'verified_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function files(): HasMany
    {
        return $this->hasMany(File::class);
    }

    public function decryptedBotToken(): string
    {
        return decrypt($this->getRawOriginal('bot_token'));
    }
}
