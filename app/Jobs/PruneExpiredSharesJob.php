<?php

namespace App\Jobs;

use App\Models\Share;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class PruneExpiredSharesJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function handle(): void
    {
        Share::whereNotNull('expires_at')
            ->where('expires_at', '<', now())
            ->delete();

        Share::whereNotNull('max_downloads')
            ->whereColumn('download_count', '>=', 'max_downloads')
            ->delete();
    }
}
