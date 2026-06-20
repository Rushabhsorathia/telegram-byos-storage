<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class File extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id', 'storage_connection_id', 'original_name', 'size_bytes',
        'mime_type', 'checksum_sha256', 'encryption_iv', 'encryption_tag',
        'encrypted_key', 'key_metadata', 'total_chunks', 'uploaded_chunks',
        'upload_batch_id', 'temp_path', 'status', 'failure_reason',
    ];

    protected function casts(): array
    {
        return [
            'size_bytes' => 'integer',
            'total_chunks' => 'integer',
            'uploaded_chunks' => 'integer',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function storageConnection(): BelongsTo
    {
        return $this->belongsTo(StorageConnection::class);
    }

    public function chunks(): HasMany
    {
        return $this->hasMany(FileChunk::class)->orderBy('chunk_index');
    }

    public function shares(): HasMany
    {
        return $this->hasMany(Share::class);
    }

    public function scopeForUser(Builder $q, int $userId): Builder
    {
        return $q->where('user_id', $userId);
    }

    public function tempPath(): string
    {
        return $this->temp_path;
    }
}
