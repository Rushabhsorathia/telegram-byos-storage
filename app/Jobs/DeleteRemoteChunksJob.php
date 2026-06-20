<?php

namespace App\Jobs;

use App\Models\File;
use App\Services\Telegram\TelegramStorage;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class DeleteRemoteChunksJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(public int $fileId)
    {
        $this->onQueue('telegram');
    }

    public function handle(TelegramStorage $storage): void
    {
        $file = File::with('storageConnection')->find($this->fileId);

        if (! $file) {
            return;
        }

        $storage->deleteAllChunks($file, $file->storageConnection);

        $file->update(['status' => 'deleted']);
    }
}
