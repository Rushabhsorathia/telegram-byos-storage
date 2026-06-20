<?php

use App\Jobs\PruneExpiredSharesJob;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::job(new PruneExpiredSharesJob)->hourly();
Schedule::command('queue:prune-batches --hours=168')->daily();
