<?php

namespace App\Jobs;

use App\Events\FileProgressUpdated;
use App\Models\File;
use App\Models\FileChunk;
use App\Services\Telegram\TelegramStorage;
use Illuminate\Bus\Batchable;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Throwable;

class UploadChunkJob implements ShouldQueue
{
    use Batchable, Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 5;

    // Large chunks (up to ~1.7 GB) can take a while to push to Telegram, so allow
    // a generous timeout. The queue worker's --timeout must be >= this value.
    public int $timeout = 3600;

    public array $backoff = [10, 30, 60, 120];

    public function __construct(
        public int $fileId,
        public int $chunkId,
    ) {
        $this->onQueue('telegram');
    }

    public function handle(TelegramStorage $storage): void
    {
        if ($this->batch()?->cancelled()) {
            return;
        }

        $file = File::with('storageConnection')->findOrFail($this->fileId);
        $chunk = FileChunk::findOrFail($this->chunkId);
        $connection = $file->storageConnection;

        if ($chunk->status === 'uploaded' && $chunk->telegram_message_id) {
            return;
        }

        $chunk->update(['status' => 'pending', 'attempts' => $chunk->attempts + 1]);

        $absolutePath = $storage->resolvePath($file->tempPath());
        // Derive the byte range from the planned chunk count so it always matches
        // the equal-sized plan produced by TelegramStorage::ensureChunksPlanned().
        $chunkCount = max(1, (int) $file->total_chunks);
        $perChunk = $storage->chunkLengthFor((int) $file->size_bytes, $chunkCount);
        $offset = $chunk->chunk_index * $perChunk;
        $expected = (int) min($perChunk, $file->size_bytes - $offset);

        $source = fopen($absolutePath, 'rb');
        fseek($source, $offset);

        $temp = tmpfile();
        stream_copy_to_stream($source, $temp, $expected);
        fclose($source);

        $tempPath = stream_get_meta_data($temp)['uri'];
        $checksum = hash_file('sha256', $tempPath);

        // Name the Telegram document after the original file. When the file fits in
        // a single chunk (<= max chunk size) it is uploaded "as-is" under its real
        // name; larger, split files get an explicit partN-of-M suffix.
        $safeName = preg_replace('/[\/\\\\"\r\n]+/', '_', (string) $file->original_name) ?: "file-{$file->id}";
        $filename = $chunkCount === 1
            ? $safeName
            : sprintf('%s.part%02dof%02d', $safeName, $chunk->chunk_index + 1, $chunkCount);

        $client = $storage->client($connection);
        $sent = $client->sendDocument(
            chatId: $connection->chat_id,
            body: $tempPath,
            filename: $filename,
        );

        fclose($temp);

        $chunk->update([
            'telegram_message_id' => $sent['message_id'],
            'telegram_file_id' => $sent['file_id'],
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
