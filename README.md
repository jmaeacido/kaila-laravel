# KAILA Laravel

Modern Laravel rebuild of KAILA, a local services marketplace where clients post service needs and nearby providers send offers.

## What Was Reused

- Old business flow: client posts request, matching providers receive urgent alerts, providers send offers/counteroffers, client accepts one, job moves through accepted/in-progress/provider-done/completion/revision/dispute/payment/rating states.
- Old schema concepts: users, provider profiles, service requests, offers, request passes, job messages, message reactions, notifications, push tokens/subscriptions, reports, public feed posts.
- Old platform rules: public signup is client/provider only; staff roles exist for admin/customer service; provider profile is required before offering; clients/providers only write accepted-job conversations; auto-confirm defaults to 48 hours; rating window defaults to 7 days.
- Old PWA/native behavior map: browser notifications, service worker installability, and old Android FCM reconnection requirements are preserved in docs/config.

## What Was Rebuilt

- Laravel session auth with username/email login.
- Laravel migrations, Eloquent models, services, validation, and protected routes.
- Consumer-grade responsive UI with mobile bottom nav and desktop rail.
- SSE in-app realtime notification stream.
- Browser Web Push subscription storage and sender using `minishlink/web-push`.
- PWA manifest and service worker.

## Local Setup

```bash
composer install
npm install
copy .env.example .env
php artisan key:generate
php artisan migrate --seed
npm run build
php artisan serve
```

Open `http://127.0.0.1:8000`.

Demo accounts after seeding:

- `client / Password123!`
- `provider / Password123!`
- `support / Password123!`
- `admin / Password123!`

## Web Push Setup

Generate VAPID keys and put them in `.env`:

```bash
vendor/bin/web-push generate:vapid
```

Then set:

```env
VAPID_SUBJECT="${APP_URL}"
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
```

Without VAPID keys, in-app SSE notifications still work and push subscriptions can be attempted only after keys are configured.

## Native Android FCM Note

The old app used Capacitor Android plus Firebase Cloud Messaging in:

```text
C:\laragon\www\kaila\android
C:\laragon\www\kaila\socket\server.js
```

Native push should be reconnected when Android packaging is brought forward. The old backend expected `GOOGLE_APPLICATION_CREDENTIALS` or `FIREBASE_SERVICE_ACCOUNT_JSON` and sent high-priority FCM data messages for jobs, offers, messages, missed calls, and incoming calls.

## Realtime

The Laravel app uses `/stream` with Server-Sent Events for realtime in-app notification updates and falls back to periodic refresh in the browser. This avoids requiring a separate Socket.IO/Reverb service for the first Laravel rebuild. The old Socket.IO server remains untouched in `C:\laragon\www\kaila`.

## Scheduled Workflow

Run this from cron or Windows Task Scheduler to auto-release provider-completed jobs whose client review window has expired:

```bash
php artisan kaila:auto-confirm
```

## Tests

```bash
php artisan test
npm run build
```
