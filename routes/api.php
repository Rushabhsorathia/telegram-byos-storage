<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\FileController;
use App\Http\Controllers\Api\ShareController;
use App\Http\Controllers\Api\StorageConnectionController;
use Illuminate\Support\Facades\Route;

Route::get('/user', [AuthController::class, 'user']);

Route::post('/register', [AuthController::class, 'register'])->middleware('guest');
Route::post('/login', [AuthController::class, 'login'])->middleware('guest');
Route::post('/logout', [AuthController::class, 'logout'])->middleware('auth');

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/crypto/master-key', [AuthController::class, 'storeMasterKey']);
    Route::get('/crypto/setup', [AuthController::class, 'cryptoSetup']);

    Route::apiResource('storage-connections', StorageConnectionController::class)->except(['show', 'update']);
    Route::post('/storage-connections/{storage_connection}/verify', [StorageConnectionController::class, 'verify']);

    Route::get('/files', [FileController::class, 'index']);
    Route::post('/files', [FileController::class, 'initiate']);
    Route::get('/files/{file}', [FileController::class, 'show']);
    Route::post('/files/{file}/chunks', [FileController::class, 'appendChunk']);
    Route::post('/files/{file}/complete', [FileController::class, 'complete']);
    Route::get('/files/{file}/download', [FileController::class, 'download']);
    Route::delete('/files/{file}', [FileController::class, 'destroy']);
    Route::post('/files/{file}/share', [FileController::class, 'share']);
});

Route::get('/shares/{token}', [ShareController::class, 'show']);
Route::post('/shares/{token}/download', [ShareController::class, 'download']);
