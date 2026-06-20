<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Folder extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id', 'parent_id', 'name', 'color', 'trashed_at',
    ];

    protected function casts(): array
    {
        return [
            'trashed_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(Folder::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(Folder::class, 'parent_id');
    }

    public function files(): HasMany
    {
        return $this->hasMany(File::class);
    }

    /** Recursive count of all files inside this folder and its descendants. */
    public function countFilesRecursive(): int
    {
        $count = $this->files()->whereNull('trashed_at')->count();
        foreach ($this->children()->whereNull('trashed_at')->get() as $child) {
            $count += $child->countFilesRecursive();
        }

        return $count;
    }
}
