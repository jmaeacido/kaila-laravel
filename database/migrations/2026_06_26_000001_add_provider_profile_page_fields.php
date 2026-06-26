<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('provider_profiles', function (Blueprint $table) {
            $table->string('tagline')->nullable()->after('display_name');
            $table->text('about')->nullable()->after('specific_services');
            $table->string('response_time')->nullable()->after('availability');
            $table->string('travel_limit')->nullable()->after('price_range');
            $table->json('work_samples')->nullable()->after('travel_limit');
            $table->json('certificates')->nullable()->after('work_samples');
        });
    }

    public function down(): void
    {
        Schema::table('provider_profiles', function (Blueprint $table) {
            $table->dropColumn([
                'tagline',
                'about',
                'response_time',
                'travel_limit',
                'work_samples',
                'certificates',
            ]);
        });
    }
};
