<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('master_key_salt')->nullable()->after('password');
            $table->string('master_key_verifier')->nullable()->after('master_key_salt');
            $table->boolean('crypto_enabled')->default(false)->after('master_key_verifier');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['master_key_salt', 'master_key_verifier', 'crypto_enabled']);
        });
    }
};
