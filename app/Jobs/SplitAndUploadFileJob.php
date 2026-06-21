<?php

namespace App\Jobs;

use App\Events\FileProgressUpdated;
use App\Models\File;
use App\Services\Telegram\TelegramStorage;
use Illuminate\Bus\Batch;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Storage as FilesystemFacade;
use Throwable;

class SplitAndUploadFileJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $timeout = 3600;

    public function __construct(public int $fileId)
    {
        $this->onQueue('telegram');
    }

    public function handle(TelegramStorage $storage): void
    {
        $file = File::with('storageConnection')->findOrFail($this->fileId);

        if ($file->status === 'complete' || $file->status === 'deleted') {
            return;
        }

        $connection = $file->storageConnection;
        abort_unless($connection && $connection->status === 'active', 422, 'Storage connection is not active.');

        $file->update(['status' => 'processing']);
        FileProgressUpdated::dispatch($file, 'Splitting into chunks');

        // Plan chunks first so the batch has a known size.
        $storage->ensureChunksPlanned($file, $storage->resolvePath($file->tempPath()));

        $chunks = $file->chunks()->orderBy('chunk_index')->get()->values();

        $fileId = $file->id;

        $batch = Bus::batch(
            $chunks->map(fn ($chunk) => new UploadChunkJob($file->id, $chunk->id))
        )
            ->then(function (Batch $batch) use ($fileId) {
                $file = File::find($fileId);
                if (! $file) {
                    return;
                }
                $file->update([
                    'status' => 'complete',
                    'uploaded_chunks' => $file->total_chunks,
                ]);
                FileProgressUpdated::dispatch($file->fresh(), 'Upload complete');

                // NOTE: must be a static call — referencing $this inside a batch
                // callback serializes the whole job graph and exhausts memory.
                self::cleanupTemp($file);
            })
            ->catch(function (Batch $batch, Throwable $e) use ($fileId) {
                $file = File::find($fileId);
                if (! $file) {
                    return;
                }
                $file->update([
                    'status' => 'failed',
                    'failure_reason' => mb_substr($e->getMessage(), 0, 1000),
                ]);
                FileProgressUpdated::dispatch($file->fresh(), 'Upload failed');
            })
            ->progress(function (Batch $batch) use ($fileId) {
                $file = File::find($fileId);
                if (! $file) {
                    return;
                }
                $file->update(['uploaded_chunks' => $batch->processedJobs()]);
                FileProgressUpdated::dispatch($file->fresh(), 'Uploading chunks');
            })
            ->onQueue('telegram')
            ->allowFailures()
            ->dispatch();

        $file->update(['upload_batch_id' => $batch->id]);
        FileProgressUpdated::dispatch($file->fresh(), 'Dispatched chunk batch');
    }

    private static function cleanupTemp(File $file): void
    {
        if (! $file->temp_path) {
            return;
        }

        try {
            $disk = config('app.upload_temp_disk', 'local');
            FilesystemFacade::disk($disk)->delete($file->temp_path);
            $file->update(['temp_path' => null]);
        } catch (Throwable $e) {
            // non-fatal
        }
    }
}
