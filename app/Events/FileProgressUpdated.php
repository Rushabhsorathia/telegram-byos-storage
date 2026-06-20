<?php

namespace App\Events;

use App\Models\File;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class FileProgressUpdated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public File $file,
        public ?string $message = null,
    ) {}

    public function broadcastOn(): array
    {
        return [
            new Channel('private-user.'.$this->file->user_id),
            new Channel('file.'.$this->file->id),
        ];
    }

    public function broadcastWith(): array
    {
        $this->file->refresh();

        return [
            'id' => $this->file->id,
            'status' => $this->file->status,
            'total_chunks' => $this->file->total_chunks,
            'uploaded_chunks' => $this->file->uploaded_chunks,
            'size_bytes' => $this->file->size_bytes,
            'message' => $this->message,
        ];
    }
}
