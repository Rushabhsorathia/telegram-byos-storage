<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'name', 'email', 'password',
        'master_key_salt', 'master_key_verifier', 'crypto_enabled',
    ];

    protected $hidden = [
        'password', 'remember_token',
        'master_key_salt', 'master_key_verifier',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'crypto_enabled' => 'boolean',
        ];
    }

    public function storageConnections(): HasMany
    {
        return $this->hasMany(StorageConnection::class);
    }

    public function files(): HasMany
    {
        return $this->hasMany(File::class);
    }

    public function shares(): HasMany
    {
        return $this->hasMany(Share::class);
    }
}
