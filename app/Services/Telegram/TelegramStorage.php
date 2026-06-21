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
            // Prefer the stored file_id (public API). Fall back to message_id (local server).
            $ref = $chunk->telegram_file_id ?: $chunk->telegram_message_id;
            if (! $ref) {
                throw new RuntimeException("Chunk {$chunk->chunk_index} has no telegram reference.");
            }

            $client->downloadDocument($ref, $target);
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
     * Number of chunks a file of the given size is split into.
     *
     * Files <= the max chunk size stay as a single document (no splitting).
     * Larger files are divided into the fewest equal parts that each fit under
     * the limit, e.g. a 3 GB file with a 1.7 GB limit becomes 2 x 1.5 GB.
     */
    public function chunkCountFor(int $size): int
    {
        return max(1, (int) ceil($size / $this->chunkSize));
    }

    /**
     * Byte length of each (equal) chunk for a file, derived from its size and
     * planned chunk count. Shared by planning and upload so they never drift.
     */
    public function chunkLengthFor(int $size, int $chunkCount): int
    {
        return (int) ceil($size / max(1, $chunkCount));
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

        $chunkCount = $this->chunkCountFor($size);
        $perChunk = $this->chunkLengthFor($size, $chunkCount);

        $rows = [];
        for ($i = 0; $i < $chunkCount; $i++) {
            $offset = $i * $perChunk;
            $rows[] = [
                'file_id' => $file->id,
                'chunk_index' => $i,
                'size_bytes' => (int) min($perChunk, $size - $offset),
                'status' => 'pending',
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }

        FileChunk::insert($rows);

        $file->update(['total_chunks' => $chunkCount, 'size_bytes' => $size]);
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
