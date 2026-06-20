<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreStorageConnectionRequest;
use App\Jobs\VerifyStorageConnectionJob;
use App\Models\StorageConnection;
use App\Services\Telegram\BotApiClient;
use App\Services\Telegram\TelegramStorage;
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
        $me = $probe->getMe();

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

    public function verify(Request $request, StorageConnection $connection)
    {
        $this->authorizeOwner($request, $connection);

        VerifyStorageConnectionJob::dispatchSync($connection->id);

        return response()->json(['connection' => $connection->fresh()]);
    }

    public function destroy(Request $request, StorageConnection $connection)
    {
        $this->authorizeOwner($request, $connection);

        $connection->delete();

        return response()->json(['message' => 'Connection removed']);
    }

    private function authorizeOwner(Request $request, StorageConnection $connection): void
    {
        abort_unless($connection->user_id === $request->user()->id, 403);
    }
}
