<?php

namespace App\Services\Telegram;

use RuntimeException;

class TelegramApiException extends RuntimeException
{
    public function __construct(string $message, public int $httpStatus = 0)
    {
        parent::__construct($message);
    }
}
