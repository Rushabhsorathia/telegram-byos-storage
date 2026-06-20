<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class Share extends Model
{
    use HasFactory;

    protected $fillable = [
        'file_id', 'user_id', 'token', 'password_hash',
        'expires_at', 'max_downloads', 'download_count',
    ];

    protected $hidden = ['password_hash'];

    protected function casts(): array
    {
        return [
            'expires_at' => 'datetime',
            'max_downloads' => 'integer',
            'download_count' => 'integer',
        ];
    }

    public function file(): BelongsTo
    {
        return $this->belongsTo(File::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    protected static function booted(): void
    {
        static::creating(function (Share $share) {
            $share->token ??= Str::random(40);
            $share->download_count ??= 0;
        });
    }

    public function isExpired(): bool
    {
        return $this->expires_at !== null && $this->expires_at->isPast();
    }

    public function isExhausted(): bool
    {
        return $this->max_downloads !== null && $this->download_count >= $this->max_downloads;
    }
}
