<?php

namespace App\Services\Telegram;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

class BotApiClient
{
    public function __construct(
        private string $botToken,
        private ?string $baseUrl = null,
        private int $timeout = 600,
    ) {
        $this->baseUrl ??= rtrim((string) config('services.telegram_bot_api.base_url',
            env('TELEGRAM_BOT_API_BASE_URL', 'http://localhost:8081')), '/');
    }

    public function getMe(): array
    {
        return $this->call('getMe');
    }

    public function sendMessage(string|int $chatId, string $text): array
    {
        return $this->call('sendMessage', ['chat_id' => $chatId, 'text' => $text]);
    }

    public function getUpdates(int $offset = -1, int $timeout = 0): array
    {
        $query = ['timeout' => $timeout, 'limit' => 1];
        if ($offset > 0) {
            $query['offset'] = $offset;
        }

        return $this->call('getUpdates', $query)['result'] ?? [];
    }

    /**
     * Upload a document chunk to a chat. Returns the message id.
     *
     * @param  resource|string  $body  Stream resource or file path.
     */
    public function sendDocument(string|int $chatId, $body, ?string $filename = null): string
    {
        $isResource = is_resource($body);
        $filename ??= 'chunk.bin';

        $multipart = [
            [
                'name' => 'chat_id',
                'contents' => (string) $chatId,
            ],
            [
                'name' => 'document',
                'contents' => $isResource ? $body : fopen($body, 'r'),
                'filename' => $filename,
            ],
        ];

        $response = $this->call('sendDocument', multipart: $multipart);

        return (string) $response['message_id'];
    }

    /**
     * Download a document referenced by message id into the given stream.
     */
    public function downloadDocument(string|int $chatId, string $messageId, $targetStream): void
    {
        $fileMeta = $this->call('getFile', ['chat_id' => $chatId, 'message_id' => (int) $messageId]);

        $fileId = $fileMeta['document']['file_id']
            ?? throw new RuntimeException('Message has no document attachment.');

        $path = $fileMeta['file_path']
            ?? throw new RuntimeException('Bot API did not return a file_path.');

        $downloadUrl = $this->baseUrl.'/file/bot'.$this->botToken.'/'.$path;

        $response = Http::withOptions(['sink' => $targetStream, 'stream' => true])
            ->timeout($this->timeout)
            ->get($downloadUrl);

        if (! $response->ok()) {
            throw new RuntimeException('Failed to download document: HTTP '.$response->status());
        }
    }

    public function deleteMessage(string|int $chatId, string $messageId): array
    {
        return $this->call('deleteMessage', [
            'chat_id' => $chatId,
            'message_id' => (int) $messageId,
        ]);
    }

    public function call(string $method, array $query = [], ?array $multipart = null, int $maxAttempts = 4): array
    {
        $url = $this->baseUrl.'/bot'.$this->botToken.'/'.$method;
        $attempt = 0;

        retry:
        try {
            $request = Http::timeout($this->timeout)->asForm();

            if ($multipart !== null) {
                $request = Http::timeout($this->timeout);
                $response = $request->attach('placeholder', '', 'placeholder')->send('POST', $url, [
                    'multipart' => $multipart,
                ]);
            } else {
                $response = $request->post($url, $query);
            }
        } catch (ConnectionException $e) {
            if (++$attempt < $maxAttempts) {
                $this->sleep(2 ** $attempt);

                goto retry;
            }
            throw $e;
        }

        if ($response->status() === 429) {
            $retryAfter = (int) ($response->json('parameters.retry_after') ?? 5);
            if ($attempt < $maxAttempts) {
                Log::warning('Telegram FLOOD_WAIT', ['retry_after' => $retryAfter, 'method' => $method]);
                $this->sleep($retryAfter + 1);

                $attempt++;
                goto retry;
            }
        }

        if (! $response->ok()) {
            throw new TelegramApiException(
                'Telegram API error ('.$method.'): '.$response->body(),
                $response->status()
            );
        }

        $json = $response->json();

        if (! ($json['ok'] ?? false)) {
            $description = $json['description'] ?? 'unknown error';
            $parameters = $json['parameters'] ?? [];

            if (isset($parameters['retry_after']) && $attempt < $maxAttempts) {
                Log::warning('Telegram FLOOD_WAIT (json)', ['retry_after' => $parameters['retry_after'], 'method' => $method]);
                $this->sleep($parameters['retry_after'] + 1);

                $attempt++;
                goto retry;
            }

            throw new TelegramApiException('Telegram API call failed ('.$method.'): '.$description);
        }

        return $json['result'] ?? [];
    }

    private function sleep(int $seconds): void
    {
        if ($seconds > 0) {
            sleep(min($seconds, 120));
        }
    }
}
