<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class AuthController extends Controller
{
    public function register(Request $request)
    {
        $data = $request->validate([
            'first_name' => ['required_without:name', 'nullable', 'string', 'max:80'],
            'middle_name' => ['nullable', 'string', 'max:80'],
            'last_name' => ['required_without:name', 'nullable', 'string', 'max:80'],
            'suffix' => ['nullable', 'string', 'max:30'],
            'name' => ['nullable', 'string', 'max:190'],
            'username' => ['required', 'regex:/^[A-Za-z0-9._-]+$/', 'min:3', 'max:80', Rule::unique('users', 'username')],
            'email' => ['nullable', 'email', 'max:190', Rule::unique('users', 'email')],
            'password' => ['required', 'string', 'min:8'],
            'role' => ['required', Rule::in(['client', 'provider'])],
            'area' => ['required', 'string', 'max:190'],
            'category' => ['nullable', 'string', 'max:160'],
            'contact_number' => ['required', 'string', 'max:80'],
            'messenger_link' => ['nullable', 'string', 'max:255'],
            'preferred_contact_channel' => ['required', 'string', 'max:80'],
            'best_contact_time' => ['nullable', 'string', 'max:120'],
            'data_privacy_consent' => ['accepted'],
        ]);

        $firstName = trim((string) ($data['first_name'] ?? ''));
        $middleName = trim((string) ($data['middle_name'] ?? ''));
        $lastName = trim((string) ($data['last_name'] ?? ''));
        $suffix = trim((string) ($data['suffix'] ?? ''));
        $composedName = trim(preg_replace('/\s+/', ' ', implode(' ', array_filter([
            $firstName,
            $middleName,
            $lastName,
            $suffix,
        ]))));
        $displayName = $composedName !== '' ? $composedName : trim((string) ($data['name'] ?? ''));

        $user = User::create([
            ...$data,
            'name' => $displayName,
            'first_name' => $firstName ?: null,
            'middle_name' => $middleName ?: null,
            'last_name' => $lastName ?: null,
            'suffix' => $suffix ?: null,
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

        Auth::login($user, $request->boolean('remember'));
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

    public function socialProfile(Request $request)
    {
        $data = $request->validate([
            'provider' => ['required', Rule::in(['google', 'facebook'])],
            'token' => ['required_without_all:credential,accessToken', 'nullable', 'string'],
            'credential' => ['required_without_all:token,accessToken', 'nullable', 'string'],
            'accessToken' => ['required_without_all:token,credential', 'nullable', 'string'],
        ]);

        $profile = $this->verifySocialCredential(
            $data['provider'],
            $data['token'] ?? $data['credential'] ?? $data['accessToken'] ?? ''
        );

        return response()->json([
            'profile' => $this->publicSocialProfile($profile),
        ]);
    }

    public function social(Request $request)
    {
        $data = $request->validate([
            'provider' => ['required', Rule::in(['google', 'facebook'])],
            'token' => ['required_without_all:credential,accessToken', 'nullable', 'string'],
            'credential' => ['required_without_all:token,accessToken', 'nullable', 'string'],
            'accessToken' => ['required_without_all:token,credential', 'nullable', 'string'],
            'mode' => ['nullable', Rule::in(['login', 'signup', 'register'])],
            'first_name' => ['nullable', 'string', 'max:80'],
            'middle_name' => ['nullable', 'string', 'max:80'],
            'last_name' => ['nullable', 'string', 'max:80'],
            'suffix' => ['nullable', 'string', 'max:30'],
            'name' => ['nullable', 'string', 'max:190'],
            'username' => ['nullable', 'regex:/^[A-Za-z0-9._-]+$/', 'min:3', 'max:80'],
            'role' => ['nullable', Rule::in(['client', 'provider'])],
            'area' => ['nullable', 'string', 'max:190'],
            'category' => ['nullable', 'string', 'max:160'],
            'contact_number' => ['nullable', 'string', 'max:80'],
            'messenger_link' => ['nullable', 'string', 'max:255'],
            'preferred_contact_channel' => ['nullable', 'string', 'max:80'],
            'best_contact_time' => ['nullable', 'string', 'max:120'],
            'data_privacy_consent' => ['nullable'],
        ]);

        $profile = $this->verifySocialCredential(
            $data['provider'],
            $data['token'] ?? $data['credential'] ?? $data['accessToken'] ?? ''
        );
        $subject = $this->authSubject($profile['provider'], $profile['subject']);

        $user = User::query()
            ->where('auth_subject', $subject)
            ->whereNull('deleted_at')
            ->where('account_status', 'active')
            ->first();

        if (!$user && $profile['email']) {
            $user = User::query()
                ->where('email', $profile['email'])
                ->whereNull('deleted_at')
                ->where('account_status', 'active')
                ->first();

            if ($user && !$user->auth_subject) {
                $user->forceFill([
                    'auth_provider' => $profile['provider'],
                    'auth_subject' => $subject,
                ])->save();
            }
        }

        $created = false;
        if ($user) {
            $this->fillMissingSocialPhoto($user, $profile);
        } else {
            $user = $this->createSocialAccount($profile, $subject, $data);
            $created = true;
        }

        Auth::login($user, true);
        $request->session()->regenerate();

        return response()->json(['user' => $user->fresh(), 'created' => $created], $created ? 201 : 200);
    }

    private function verifySocialCredential(string $provider, string $token): array
    {
        return match (strtolower(trim($provider))) {
            'google' => $this->verifyGoogleCredential($token),
            'facebook' => $this->verifyFacebookAccessToken($token),
            default => abort(400, 'Unsupported social login provider'),
        };
    }

    private function verifyGoogleCredential(string $credential): array
    {
        $clientId = (string) config('kaila.auth.google_client_id');
        abort_if($clientId === '', 503, 'Google login is not configured.');

        $credential = trim($credential);
        abort_if($credential === '', 401, 'Google credential is required.');

        $tokenInfoUrl = $this->looksLikeJwt($credential)
            ? 'https://oauth2.googleapis.com/tokeninfo?id_token='.urlencode($credential)
            : 'https://oauth2.googleapis.com/tokeninfo?access_token='.urlencode($credential);

        $tokenInfoResponse = Http::timeout(10)->get($tokenInfoUrl);
        $tokenInfo = $tokenInfoResponse->json() ?: [];

        abort_if(
            !$tokenInfoResponse->ok()
                || (string) ($tokenInfo['aud'] ?? '') !== $clientId
                || empty($tokenInfo['sub'])
                || empty($tokenInfo['email'])
                || (string) ($tokenInfo['email_verified'] ?? 'true') === 'false',
            401,
            'Google token could not be verified.'
        );

        $profile = [];
        if (!$this->looksLikeJwt($credential)) {
            $profileResponse = Http::timeout(10)
                ->withToken($credential)
                ->get('https://openidconnect.googleapis.com/v1/userinfo');
            $profile = $profileResponse->ok() ? ($profileResponse->json() ?: []) : [];
        }

        return [
            'provider' => 'google',
            'subject' => (string) $tokenInfo['sub'],
            'email' => strtolower((string) ($tokenInfo['email'] ?? $profile['email'] ?? '')),
            'name' => (string) ($profile['name'] ?? $tokenInfo['name'] ?? $tokenInfo['email']),
            'photoUrl' => $this->socialPhotoUrl((string) ($profile['picture'] ?? $tokenInfo['picture'] ?? '')),
        ];
    }

    private function verifyFacebookAccessToken(string $accessToken): array
    {
        $appId = (string) config('kaila.auth.facebook_app_id');
        $appSecret = (string) config('kaila.auth.facebook_app_secret');
        abort_if($appId === '' || $appSecret === '', 503, 'Facebook login is not configured.');

        $accessToken = trim($accessToken);
        abort_if($accessToken === '', 401, 'Facebook access token is required.');

        $debugResponse = Http::timeout(10)->get('https://graph.facebook.com/debug_token', [
            'input_token' => $accessToken,
            'access_token' => "{$appId}|{$appSecret}",
        ]);
        $debugData = $debugResponse->json('data') ?: [];

        abort_if(
            !$debugResponse->ok()
                || empty($debugData['is_valid'])
                || (string) ($debugData['app_id'] ?? '') !== $appId,
            401,
            'Facebook token could not be verified.'
        );

        $scopes = $debugData['scopes'] ?? [];
        $fields = is_array($scopes) && in_array('email', $scopes, true)
            ? 'id,name,email,picture.type(large)'
            : 'id,name,picture.type(large)';

        $profileResponse = Http::timeout(10)->get('https://graph.facebook.com/me', [
            'fields' => $fields,
            'access_token' => $accessToken,
        ]);
        $profile = $profileResponse->json() ?: [];

        abort_if(!$profileResponse->ok() || empty($profile['id']), 401, 'Facebook profile could not be loaded.');

        return [
            'provider' => 'facebook',
            'subject' => (string) $profile['id'],
            'email' => strtolower((string) ($profile['email'] ?? '')),
            'name' => (string) ($profile['name'] ?? 'Facebook user'),
            'photoUrl' => $this->socialPhotoUrl((string) data_get($profile, 'picture.data.url', '')),
        ];
    }

    private function createSocialAccount(array $profile, string $subject, array $input): User
    {
        $nameParts = $this->namePartsFromInput($input, $profile['name'] ?? '');
        $displayName = $this->displayName($nameParts) ?: (string) ($profile['name'] ?? 'KAILA user');

        return User::create([
            'name' => $displayName,
            'first_name' => $nameParts['first_name'],
            'middle_name' => $nameParts['middle_name'],
            'last_name' => $nameParts['last_name'],
            'suffix' => $nameParts['suffix'],
            'username' => $this->uniqueUsernameFrom($input['username'] ?? $profile['email'] ?? $profile['name'] ?? $profile['provider'].'_'.$profile['subject']),
            'email' => $profile['email'] ?: null,
            'password' => Hash::make(Str::random(48)),
            'role' => $input['role'] ?? 'client',
            'area' => trim((string) ($input['area'] ?? '')) ?: 'Profile pending',
            'category' => trim((string) ($input['category'] ?? '')) ?: 'General local service',
            'contact_number' => trim((string) ($input['contact_number'] ?? '')) ?: null,
            'messenger_link' => trim((string) ($input['messenger_link'] ?? '')) ?: null,
            'preferred_contact_channel' => trim((string) ($input['preferred_contact_channel'] ?? '')) ?: null,
            'best_contact_time' => trim((string) ($input['best_contact_time'] ?? '')) ?: null,
            'auth_provider' => $profile['provider'],
            'auth_subject' => $subject,
            'social_photo_url' => $this->socialPhotoUrl((string) ($profile['photoUrl'] ?? '')) ?: null,
            'data_privacy_consent' => filter_var($input['data_privacy_consent'] ?? false, FILTER_VALIDATE_BOOLEAN),
            'account_status' => 'active',
        ]);
    }

    private function publicSocialProfile(array $profile): array
    {
        $email = strtolower(trim((string) ($profile['email'] ?? '')));

        return [
            'provider' => $profile['provider'] ?? '',
            'name' => $profile['name'] ?? '',
            'email' => $email,
            'username' => $email ? Str::limit(preg_replace('/[^a-z0-9._-]+/', '_', Str::before($email, '@')), 40, '') : '',
            'photoUrl' => $this->socialPhotoUrl((string) ($profile['photoUrl'] ?? '')),
        ];
    }

    private function fillMissingSocialPhoto(User $user, array $profile): void
    {
        $photoUrl = $this->socialPhotoUrl((string) ($profile['photoUrl'] ?? ''));
        if ($photoUrl && !$user->social_photo_url) {
            $user->forceFill(['social_photo_url' => $photoUrl])->save();
        }
    }

    private function authSubject(string $provider, string $subject): string
    {
        return strtolower(trim($provider)).':'.trim($subject);
    }

    private function socialPhotoUrl(string $value): string
    {
        $url = trim($value);
        return $url !== '' && strlen($url) <= 1024 && preg_match('/^https?:\/\//i', $url) ? $url : '';
    }

    private function looksLikeJwt(string $value): bool
    {
        return count(explode('.', $value)) === 3;
    }

    private function uniqueUsernameFrom(string $source): string
    {
        $base = strtolower(preg_replace('/[^a-z0-9._-]+/', '_', Str::before(trim($source), '@')));
        $base = trim($base, '._-') ?: 'kaila_user';
        $base = Str::limit($base, 40, '');
        $username = $base;
        $suffix = 2;

        while (User::query()->where('username', $username)->exists()) {
            $username = Str::limit($base, 36, '').'_'.$suffix++;
        }

        return $username;
    }

    private function namePartsFromInput(array $input, string $fallbackName): array
    {
        $parts = [
            'first_name' => trim((string) ($input['first_name'] ?? '')),
            'middle_name' => trim((string) ($input['middle_name'] ?? '')),
            'last_name' => trim((string) ($input['last_name'] ?? '')),
            'suffix' => trim((string) ($input['suffix'] ?? '')),
        ];

        if ($parts['first_name'] === '' && $parts['last_name'] === '') {
            $tokens = preg_split('/\s+/', trim($fallbackName), -1, PREG_SPLIT_NO_EMPTY) ?: [];
            $parts['first_name'] = array_shift($tokens) ?: '';
            $parts['last_name'] = count($tokens) ? array_pop($tokens) : '';
            $parts['middle_name'] = implode(' ', $tokens);
        }

        return array_map(fn ($value) => $value !== '' ? $value : null, $parts);
    }

    private function displayName(array $parts): string
    {
        return trim(preg_replace('/\s+/', ' ', implode(' ', array_filter([
            $parts['first_name'] ?? '',
            $parts['middle_name'] ?? '',
            $parts['last_name'] ?? '',
            $parts['suffix'] ?? '',
        ]))));
    }
}
