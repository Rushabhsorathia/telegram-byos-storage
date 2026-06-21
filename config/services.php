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
        // Maximum size of a single Telegram document (a "chunk"). Files at or below
        // this size are uploaded as ONE document (no splitting). Larger files are split
        // into equal parts, each <= this size. The Telegram local Bot API server allows
        // up to 2000 MB per upload, so 1740 MB (~1.7 GB) leaves safe headroom.
        // NOTE: the public api.telegram.org caps uploads at 50 MB — run a local Bot API
        // server (see TELEGRAM_BOT_API_BASE_URL) to use large chunks.
        'chunk_size_mb' => (int) env('TELEGRAM_CHUNK_SIZE_MB', 1740),
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
