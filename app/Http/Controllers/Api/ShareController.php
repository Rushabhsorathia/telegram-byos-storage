<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Share;
use App\Services\Telegram\TelegramStorage;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class ShareController extends Controller
{
    public function show(string $token)
    {
        $share = Share::with('file.storageConnection')->where('token', $token)->firstOrFail();

        if ($share->isExpired() || $share->isExhausted()) {
            abort(410, 'This share link is no longer available.');
        }

        return response()->json([
            'share' => $share->only(['id', 'token', 'expires_at', 'max_downloads', 'download_count']),
            'file' => $share->file->only(['id', 'original_name', 'size_bytes', 'mime_type', 'encryption_iv', 'encryption_tag']),
            'requires_password' => (bool) $share->password_hash,
        ]);
    }

    public function download(Request $request, string $token)
    {
        $request->validate(['password' => ['nullable', 'string']]);

        $share = Share::with('file.storageConnection')->where('token', $token)->firstOrFail();

        if ($share->isExpired() || $share->isExhausted()) {
            abort(410, 'Share link expired or exhausted.');
        }

        if ($share->password_hash && ! Hash::check((string) $request->input('password'), $share->password_hash)) {
            return response()->json(['message' => 'Invalid password.'], 403);
        }

        $share->increment('download_count');

        $file = $share->file;
        $storage = app(TelegramStorage::class);

        return response()->stream(function () use ($file, $storage) {
            $out = fopen('php://output', 'wb');
            $storage->streamTo($file, $file->storageConnection, $out);
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
