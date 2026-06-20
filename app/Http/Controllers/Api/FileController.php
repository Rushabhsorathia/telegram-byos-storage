<?php

namespace App\Http\Controllers\Api;

use App\Events\FileProgressUpdated;
use App\Http\Controllers\Controller;
use App\Http\Requests\InitiateFileUploadRequest;
use App\Http\Requests\ShareFileRequest;
use App\Jobs\DeleteRemoteChunksJob;
use App\Jobs\SplitAndUploadFileJob;
use App\Models\File;
use App\Models\StorageConnection;
use App\Services\Telegram\TelegramStorage;
use Illuminate\Http\Request;
use Illuminate\Http\StreamedResponse;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage as FilesystemFacade;
use Illuminate\Support\Str;

class FileController extends Controller
{
    public function index(Request $request)
    {
        $files = $request->user()
            ->files()
            ->latest()
            ->with('storageConnection:id,chat_title,bot_username')
            ->withCount('shares')
            ->paginate(50);

        return response()->json($files);
    }

    public function show(Request $request, File $file)
    {
        abort_unless($file->user_id === $request->user()->id, 404);

        $file->load(['storageConnection:id,chat_title,bot_username', 'chunks:id,file_id,chunk_index,size_bytes,status', 'shares:id,file_id,token,expires_at,max_downloads,download_count']);

        return response()->json(['file' => $file]);
    }

    /**
     * Step 1: create the file record + a temp path. Returns the upload endpoint.
     * The browser will then stream encrypted chunks to the append endpoint.
     */
    public function initiate(InitiateFileUploadRequest $request)
    {
        $data = $request->validated();
        $user = $request->user();

        $connection = StorageConnection::where('user_id', $user->id)
            ->where('status', 'active')
            ->findOrFail($data['storage_connection_id']);

        $disk = config('app.upload_temp_disk', 'local');
        $tempRelative = 'uploads/'.Str::uuid()->toString().'.enc';
        FilesystemFacade::disk($disk)->put($tempRelative, '');

        $file = $user->files()->create([
            'storage_connection_id' => $connection->id,
            'original_name' => $data['original_name'],
            'size_bytes' => $data['size_bytes'],
            'mime_type' => $data['mime_type'] ?? null,
            'checksum_sha256' => $data['checksum_sha256'] ?? null,
            'encryption_iv' => $data['encryption_iv'] ?? null,
            'encryption_tag' => $data['encryption_tag'] ?? null,
            'encrypted_key' => $data['encrypted_key'] ?? null,
            'key_metadata' => $data['key_metadata'] ?? null,
            'temp_path' => $tempRelative,
            'status' => 'uploading',
        ]);

        return response()->json([
            'file' => $file,
            'upload_url' => url("/api/files/{$file->id}/chunks"),
        ], 201);
    }

    /**
     * Step 2: append an encrypted chunk (resumable). Offset in bytes is honored.
     */
    public function appendChunk(Request $request, File $file)
    {
        abort_unless($file->user_id === $request->user()->id, 404);
        abort_if($file->status === 'complete', 422, 'Upload already complete.');

        $request->validate([
            'chunk' => ['required', 'file'],
            'offset' => ['required', 'integer', 'min:0'],
        ]);

        $disk = config('app.upload_temp_disk', 'local');
        $absolute = FilesystemFacade::disk($disk)->path($file->temp_path);

        $uploaded = $request->file('chunk')->getRealPath();
        $target = fopen($absolute, file_exists($absolute) && $request->offset > 0 ? 'r+' : 'w');
        fseek($target, $request->offset);
        stream_copy_to_stream(fopen($uploaded, 'r'), $target);
        fclose($target);

        clearstatcache(true, $absolute);
        $file->update(['uploaded_chunks' => 0, 'size_bytes' => max($file->size_bytes, filesize($absolute))]);

        FileProgressUpdated::dispatch($file->fresh(), 'Receiving encrypted chunks from browser');

        return response()->json([
            'offset' => filesize($absolute),
            'file' => $file->fresh(),
        ]);
    }

    /**
     * Step 3: finalize browser upload and dispatch server-side chunking -> Telegram.
     */
    public function complete(Request $request, File $file)
    {
        abort_unless($file->user_id === $request->user()->id, 404);

        $file->update(['status' => 'processing']);
        SplitAndUploadFileJob::dispatch($file->id);

        return response()->json(['file' => $file->fresh()]);
    }

    public function download(Request $request, File $file)
    {
        abort_unless($file->user_id === $request->user()->id, 404);
        abort_if($file->status !== 'complete', 409, 'File is not fully uploaded yet.');

        return $this->streamedDownload($file, $file->storageConnection);
    }

    public function destroy(Request $request, File $file)
    {
        abort_unless($file->user_id === $request->user()->id, 404);

        if ($file->temp_path) {
            FilesystemFacade::disk(config('app.upload_temp_disk', 'local'))->delete($file->temp_path);
        }

        if (in_array($file->status, ['complete', 'failed', 'processing'])) {
            DeleteRemoteChunksJob::dispatch($file->id);
        }

        $file->update(['status' => 'deleted']);

        return response()->json(['message' => 'File scheduled for deletion']);
    }

    public function share(ShareFileRequest $request, File $file)
    {
        abort_unless($file->user_id === $request->user()->id, 404);

        $data = $request->validated();
        if (! empty($data['password'])) {
            $data['password_hash'] = Hash::make($data['password']);
        }
        unset($data['password']);

        $share = $file->shares()->create($data + ['user_id' => $request->user()->id]);

        return response()->json(['share' => $share, 'url' => url("/s/{$share->token}")], 201);
    }

    private function streamedDownload(File $file, StorageConnection $connection): StreamedResponse
    {
        $storage = app(TelegramStorage::class);

        return response()->stream(function () use ($file, $connection, $storage) {
            $out = fopen('php://output', 'wb');
            $storage->streamTo($file, $connection, $out);
            fclose($out);
        }, 200, [
            'Content-Type' => 'application/octet-stream',
            'Content-Length' => $file->size_bytes,
            'Content-Disposition' => 'attachment; filename="'.str_replace('"', '', $file->original_name).'"',
            'X-File-Encrypted' => 'true',
            'X-File-Iv' => (string) ($file->encryption_iv ?? ''),
        ]);
    }
}
