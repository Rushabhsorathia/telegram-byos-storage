<?php

namespace App\Jobs;

use App\Events\FileProgressUpdated;
use App\Models\File;
use App\Models\FileChunk;
use App\Services\Telegram\TelegramStorage;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Throwable;

class UploadChunkJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 5;

    public int $timeout = 1200;

    public array $backoff = [10, 30, 60, 120];

    public function __construct(
        public int $fileId,
        public int $chunkId,
    ) {
        $this->onQueue('telegram');
    }

    public function handle(TelegramStorage $storage): void
    {
        $file = File::with('storageConnection')->findOrFail($this->fileId);
        $chunk = FileChunk::findOrFail($this->chunkId);
        $connection = $file->storageConnection;

        if ($chunk->status === 'uploaded' && $chunk->telegram_message_id) {
            return;
        }

        $chunk->update(['status' => 'pending', 'attempts' => $chunk->attempts + 1]);

        $absolutePath = $storage->resolvePath($file->tempPath());
        $chunkSize = (int) config('services.telegram_bot_api.chunk_size_mb', 1) * 1024 * 1024;
        $offset = $chunk->chunk_index * $chunkSize;
        $expected = (int) min($chunkSize, $file->size_bytes - $offset);

        $source = fopen($absolutePath, 'rb');
        fseek($source, $offset);

        $temp = tmpfile();
        stream_copy_to_stream($source, $temp, $expected);
        fclose($source);

        $tempPath = stream_get_meta_data($temp)['uri'];
        $checksum = hash_file('sha256', $tempPath);

        $client = $storage->client($connection);
        $messageId = $client->sendDocument(
            chatId: $connection->chat_id,
            body: $tempPath,
            filename: "{$file->id}-{$chunk->chunk_index}.bin",
        );

        fclose($temp);

        $chunk->update([
            'telegram_message_id' => $messageId,
            'checksum_sha256' => $checksum,
            'size_bytes' => $expected,
            'status' => 'uploaded',
            'last_error' => null,
        ]);

        FileProgressUpdated::dispatch($file->fresh(), "Chunk {$chunk->chunk_index} uploaded");
    }

    public function failed(Throwable $e): void
    {
        $chunk = FileChunk::find($this->chunkId);
        $chunk?->update(['status' => 'failed', 'last_error' => mb_substr($e->getMessage(), 0, 500)]);

        if ($file = File::find($this->fileId)) {
            FileProgressUpdated::dispatch($file, "Chunk {$chunk?->chunk_index} failed: {$e->getMessage()}");
        }
    }
}
