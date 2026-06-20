<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'telegram_bot_api' => [
        'base_url' => env('TELEGRAM_BOT_API_BASE_URL', 'http://localhost:8081'),
        'chunk_size_mb' => (int) env('TELEGRAM_CHUNK_SIZE_MB', 1),
        'upload_concurrency' => (int) env('TELEGRAM_UPLOAD_CONCURRENCY', 3),
        'request_timeout' => (int) env('TELEGRAM_REQUEST_TIMEOUT', 600),
        'download_timeout' => (int) env('TELEGRAM_DOWNLOAD_TIMEOUT', 600),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

];
