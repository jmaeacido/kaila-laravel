<?php

use App\Services\MarketplaceWorkflow;
use App\Services\NotificationService;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('kaila:auto-confirm', function (MarketplaceWorkflow $workflow, NotificationService $notifications) {
    $count = $workflow->autoConfirmDue($notifications);

    $this->info("Auto-confirmed {$count} KAILA job(s).");
})->purpose('Auto-release due KAILA jobs after the client review window');
