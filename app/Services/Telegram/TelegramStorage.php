<?php

namespace App\Services\Telegram;

use App\Models\File;
use App\Models\FileChunk;
use App\Models\StorageConnection;
use Illuminate\Support\Facades\Storage as FilesystemFacade;
use RuntimeException;

class TelegramStorage
{
    private int $chunkSize;

    public function __construct()
    {
        $this->chunkSize = (int) config('services.telegram_bot_api.chunk_size_mb', 1) * 1024 * 1024;
    }

    public function client(StorageConnection $connection): BotApiClient
    {
        return new BotApiClient(
            botToken: $connection->decryptedBotToken(),
            timeout: (int) config('services.telegram_bot_api.request_timeout', 600),
        );
    }

    /**
     * Stream a full file back to a target resource (e.g. a StreamedResponse output).
     *
     * @param  resource  $target  writable stream
     */
    public function streamTo(File $file, StorageConnection $connection, $target): void
    {
        $client = $this->client($connection);

        foreach ($file->chunks()->orderBy('chunk_index')->get() as $chunk) {
            if (! $chunk->telegram_message_id) {
                throw new RuntimeException("Chunk {$chunk->chunk_index} has no telegram message id.");
            }

            $client->downloadDocument($connection->chat_id, $chunk->telegram_message_id, $target);
        }
    }

    /**
     * Delete every chunk message stored on Telegram for a file.
     */
    public function deleteAllChunks(File $file, StorageConnection $connection): void
    {
        $client = $this->client($connection);

        foreach ($file->chunks as $chunk) {
            if (! $chunk->telegram_message_id) {
                continue;
            }

            try {
                $client->deleteMessage($connection->chat_id, $chunk->telegram_message_id);
            } catch (TelegramApiException $e) {
                // Message may already be gone; best-effort deletion.
            }

            $chunk->update(['telegram_message_id' => null, 'status' => 'failed']);
        }
    }

    /**
     * Create/refresh chunk plan rows based on file size.
     */
    public function ensureChunksPlanned(File $file, string $absolutePath): void
    {
        if ($file->chunks()->exists()) {
            return;
        }

        $size = filesize($absolutePath) ?: $file->size_bytes;
        $file->size_bytes = $size;

        $chunkCount = max(1, (int) ceil($size / $this->chunkSize));

        $rows = [];
        for ($i = 0; $i < $chunkCount; $i++) {
            $rows[] = [
                'file_id' => $file->id,
                'chunk_index' => $i,
                'size_bytes' => (int) min($this->chunkSize, $size - $i * $this->chunkSize),
                'status' => 'pending',
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }

        FileChunk::insert($rows);

        $file->update(['total_chunks' => $chunkCount]);
    }

    public function resolvePath(string $relativePath): string
    {
        return $this->resolveAbsolutePath($relativePath);
    }

    private function resolveAbsolutePath(string $relativePath): string
    {
        $disk = config('app.upload_temp_disk', 'local');

        if (FilesystemFacade::disk($disk)->exists($relativePath)) {
            return FilesystemFacade::disk($disk)->path($relativePath);
        }

        if (is_file($relativePath)) {
            return $relativePath;
        }

        throw new RuntimeException("Upload temp file not found: {$relativePath}");
    }
}
