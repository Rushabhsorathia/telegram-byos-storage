<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Requests\StoreMasterKeyRequest;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function register(RegisterRequest $request)
    {
        $data = $request->validated();
        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => $data['password'],
        ]);

        auth()->login($user);

        return response()->json(['user' => $user], 201);
    }

    public function login(Request $request)
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        if (! auth()->attempt($credentials, $request->boolean('remember'))) {
            throw ValidationException::withMessages([
                'email' => __('The provided credentials are incorrect.'),
            ]);
        }

        $request->session()->regenerate();

        return response()->json(['user' => $request->user()]);
    }

    public function logout(Request $request)
    {
        auth()->guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json(['message' => 'Logged out']);
    }

    public function user(Request $request)
    {
        return response()->json(['user' => $request->user()]);
    }

    /**
     * Persist the client-derived encryption master key salt + verifier.
     * The derived key itself never leaves the browser.
     */
    public function storeMasterKey(StoreMasterKeyRequest $request)
    {
        $data = $request->validated();
        $user = $request->user();
        $user->update([
            'master_key_salt' => $data['master_key_salt'],
            'master_key_verifier' => $data['master_key_verifier'],
            'crypto_enabled' => true,
        ]);

        return response()->json(['crypto_enabled' => true]);
    }

    /**
     * Return the salt + verifier so the browser can re-derive the master key.
     * Neither of these is secret — they only let the client confirm a correct passphrase.
     */
    public function cryptoSetup(Request $request)
    {
        $user = $request->user();

        return response()->json([
            'crypto_enabled' => $user->crypto_enabled,
            'master_key_salt' => $user->master_key_salt,
            'master_key_verifier' => $user->master_key_verifier,
        ]);
    }
}
