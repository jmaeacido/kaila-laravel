<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('first_name', 80)->nullable()->after('name');
            $table->string('middle_name', 80)->nullable()->after('first_name');
            $table->string('last_name', 80)->nullable()->after('middle_name');
            $table->string('suffix', 30)->nullable()->after('last_name');
            $table->string('messenger_link')->nullable()->after('contact_number');
            $table->string('auth_provider', 40)->nullable()->after('best_contact_time');
            $table->string('auth_subject')->nullable()->unique()->after('auth_provider');
            $table->string('social_photo_url')->nullable()->after('auth_subject');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'first_name',
                'middle_name',
                'last_name',
                'suffix',
                'messenger_link',
                'auth_provider',
                'auth_subject',
                'social_photo_url',
            ]);
        });
    }
};
