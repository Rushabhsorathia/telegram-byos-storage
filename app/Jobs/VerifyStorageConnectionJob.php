<?php

namespace App\Jobs;

use App\Models\StorageConnection;
use App\Services\Telegram\TelegramApiException;
use App\Services\Telegram\TelegramStorage;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Storage as FilesystemFacade;
use Throwable;

class VerifyStorageConnectionJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public array $backoff = [5, 15];

    public function __construct(public int $connectionId)
    {
        $this->onQueue('default');
    }

    public function handle(TelegramStorage $storage): void
    {
        $connection = StorageConnection::findOrFail($this->connectionId);
        $connection->update(['status' => 'pending', 'last_error' => null]);

        $client = $storage->client($connection);

        // Round-trip test: send a tiny document, fetch it, delete it.
        $disk = config('app.upload_temp_disk', 'local');
        $relative = 'telegram-verify/'.uniqid('probe_', true).'.bin';
        FilesystemFacade::disk($disk)->put($relative, sha1(uniqid('', true)));

        $absolute = FilesystemFacade::disk($disk)->path($relative);

        try {
            $me = $client->getMe();
            $connection->bot_username = $me['username'] ?? $connection->bot_username;

            $sent = $client->sendDocument(
                chatId: $connection->chat_id,
                body: $absolute,
                filename: 'verify.bin',
            );

            $tmpOut = tmpfile();
            $client->downloadDocument($sent['file_id'], $tmpOut);
            rewind($tmpOut);
            $downloaded = stream_get_contents($tmpOut);
            fclose($tmpOut);

            if (! hash_equals(FilesystemFacade::disk($disk)->get($relative), $downloaded)) {
                throw new TelegramApiException('Round-trip integrity check failed.');
            }

            $client->deleteMessage($connection->chat_id, $sent['message_id']);

            $connection->update([
                'status' => 'active',
                'verified_at' => now(),
                'last_error' => null,
            ]);
        } catch (Throwable $e) {
            $connection->update([
                'status' => 'failed',
                'last_error' => mb_substr($e->getMessage(), 0, 500),
            ]);

            throw $e;
        } finally {
            FilesystemFacade::disk($disk)->delete($relative);
        }
    }
}
