<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\MarketplaceController;
use Illuminate\Support\Facades\Route;

Route::get('/', [MarketplaceController::class, 'app'])->name('app');

Route::post('/auth/register', [AuthController::class, 'register'])->middleware('guest');
Route::post('/auth/login', [AuthController::class, 'login'])->middleware('guest');
Route::post('/auth/logout', [AuthController::class, 'logout'])->middleware('auth');

Route::middleware('auth')->group(function () {
    Route::get('/api/state', [MarketplaceController::class, 'state'])->name('api.state');
    Route::post('/api/providers', [MarketplaceController::class, 'saveProvider']);
    Route::post('/api/requests', [MarketplaceController::class, 'createRequest']);
    Route::put('/api/requests/{serviceRequest}', [MarketplaceController::class, 'updateRequest']);
    Route::post('/api/requests/{serviceRequest}/offers', [MarketplaceController::class, 'offer']);
    Route::post('/api/requests/{serviceRequest}/pass', [MarketplaceController::class, 'pass']);
    Route::post('/api/requests/{serviceRequest}/offers/{offer}/accept', [MarketplaceController::class, 'acceptOffer']);
    Route::post('/api/requests/{serviceRequest}/action', [MarketplaceController::class, 'action']);
    Route::get('/api/requests/{serviceRequest}/messages', [MarketplaceController::class, 'messages']);
    Route::post('/api/requests/{serviceRequest}/messages', [MarketplaceController::class, 'sendMessage']);
    Route::post('/api/reports', [MarketplaceController::class, 'report']);
    Route::post('/api/feed', [MarketplaceController::class, 'feed']);
    Route::post('/api/notifications/read', [MarketplaceController::class, 'markNotifications']);
    Route::post('/api/push-subscriptions', [MarketplaceController::class, 'pushSubscribe']);
    Route::get('/stream', [MarketplaceController::class, 'stream']);
});
