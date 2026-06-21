<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FileChunk extends Model
{
    use HasFactory;

    protected $fillable = [
        'file_id', 'chunk_index', 'size_bytes', 'checksum_sha256',
        'telegram_message_id', 'telegram_file_id', 'status', 'attempts', 'last_error',
    ];

    protected function casts(): array
    {
        return [
            'chunk_index' => 'integer',
            'size_bytes' => 'integer',
            'attempts' => 'integer',
        ];
    }

    public function file(): BelongsTo
    {
        return $this->belongsTo(File::class);
    }
}
