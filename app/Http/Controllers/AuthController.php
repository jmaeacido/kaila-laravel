<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class AuthController extends Controller
{
    public function register(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:160'],
            'username' => ['required', 'alpha_dash', 'min:3', 'max:80', Rule::unique('users', 'username')],
            'email' => ['nullable', 'email', 'max:190', Rule::unique('users', 'email')],
            'password' => ['required', 'string', 'min:8'],
            'role' => ['required', Rule::in(['client', 'provider'])],
            'area' => ['required', 'string', 'max:190'],
            'category' => ['nullable', 'string', 'max:160'],
            'data_privacy_consent' => ['accepted'],
        ]);

        $user = User::create([
            ...$data,
            'username' => strtolower($data['username']),
            'password' => Hash::make($data['password']),
            'account_status' => 'active',
        ]);

        Auth::login($user);

        return response()->json(['user' => $user]);
    }

    public function login(Request $request)
    {
        $data = $request->validate([
            'username' => ['required', 'string'],
            'password' => ['required', 'string'],
        ]);

        $login = strtolower(trim($data['username']));
        $user = User::query()
            ->where('username', $login)
            ->orWhere('email', $login)
            ->first();

        if (!$user || !Hash::check($data['password'], $user->password) || $user->account_status !== 'active') {
            return response()->json(['message' => 'The account details do not match an active KAILA account.'], 422);
        }

        Auth::login($user, true);
        $request->session()->regenerate();

        return response()->json(['user' => $user]);
    }

    public function logout(Request $request)
    {
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json(['ok' => true]);
    }

    public function forgotPassword(Request $request)
    {
        $request->validate([
            'username' => ['nullable', 'string', 'max:190'],
            'email' => ['nullable', 'email', 'max:190'],
        ]);

        return response()->json([
            'ok' => true,
            'message' => 'Password reset is handled by KAILA support for this migrated MVP.',
        ]);
    }
}
