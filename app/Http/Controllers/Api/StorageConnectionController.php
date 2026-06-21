<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreStorageConnectionRequest;
use App\Jobs\VerifyStorageConnectionJob;
use App\Models\StorageConnection;
use App\Services\Telegram\BotApiClient;
use App\Services\Telegram\TelegramApiException;
use App\Services\Telegram\TelegramStorage;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Request;

class StorageConnectionController extends Controller
{
    public function __construct(private readonly TelegramStorage $storage) {}

    public function index(Request $request)
    {
        $connections = $request->user()
            ->storageConnections()
            ->latest()
            ->get();

        $usage = $request->user()->files()
            ->where('status', 'complete')
            ->sum('size_bytes');

        return response()->json([
            'connections' => $connections,
            'usage_bytes' => $usage,
        ]);
    }

    public function store(StoreStorageConnectionRequest $request)
    {
        $data = $request->validated();

        // Validate the bot token up-front against the local Bot API server.
        $probe = new BotApiClient($data['bot_token']);
        try {
            $me = $probe->getMe();
        } catch (ConnectionException $e) {
            report($e);

            return response()->json([
                'message' => 'Could not reach the Telegram Bot API server on '.config('services.telegram_bot_api.base_url').'. Is it running?',
                'hint' => 'Start it with: docker run -p 8081:8080 -e TELEGRAM_API_ID=... -e TELEGRAM_API_HASH=... aiogram/telegram-bot-api:latest',
            ], 503);
        } catch (TelegramApiException $e) {
            return response()->json([
                'message' => 'Telegram rejected the bot token: '.$e->getMessage(),
            ], 422);
        }

        $connection = $request->user()->storageConnections()->create([
            'label' => $data['label'] ?? null,
            'bot_token' => encrypt($data['bot_token']),
            'bot_username' => $me['username'] ?? null,
            'chat_id' => $data['chat_id'],
            'chat_title' => $data['chat_title'] ?? null,
            'status' => 'pending',
        ]);

        VerifyStorageConnectionJob::dispatch($connection->id);

        return response()->json(['connection' => $connection], 201);
    }

    public function verify(Request $request, StorageConnection $storageConnection)
    {
        $this->authorizeOwner($request, $storageConnection);

        try {
            VerifyStorageConnectionJob::dispatchSync($storageConnection->id);
        } catch (\Throwable $e) {
            $okCodes = [503, 422];
            $status = $e instanceof ConnectionException ? 503 : 500;
            $msg = $e->getMessage();

            return response()->json([
                'message' => $e instanceof ConnectionException
                    ? 'Could not reach the Telegram Bot API server. Is it running on '.config('services.telegram_bot_api.base_url').'?'
                    : 'Verification failed: '.$msg,
                'connection' => $storageConnection->fresh(),
            ], in_array($status, $okCodes, true) ? $status : 500);
        }

        return response()->json(['connection' => $storageConnection->fresh()]);
    }

    public function destroy(Request $request, StorageConnection $storageConnection)
    {
        $this->authorizeOwner($request, $storageConnection);

        $storageConnection->delete();

        return response()->json(['message' => 'Connection removed']);
    }

    private function authorizeOwner(Request $request, StorageConnection $storageConnection): void
    {
        abort_unless((int) $storageConnection->user_id === (int) $request->user()->id, 403, 'You do not own this connection.');
    }
}
