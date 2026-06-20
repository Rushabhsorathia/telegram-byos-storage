<?php

use App\Models\File;
use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

Broadcast::channel('private-user.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

Broadcast::channel('file.{fileId}', function ($user, $fileId) {
    return File::where('id', $fileId)->where('user_id', $user->id)->exists();
});
