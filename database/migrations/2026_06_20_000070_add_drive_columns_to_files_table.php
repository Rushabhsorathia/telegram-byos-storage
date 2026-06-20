<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('files', function (Blueprint $table) {
            $table->foreignId('folder_id')->nullable()->after('storage_connection_id')->constrained('folders')->cascadeOnDelete();
            $table->boolean('starred')->default(false)->after('status');
            $table->timestamp('trashed_at')->nullable()->after('starred');

            $table->index(['user_id', 'folder_id']);
            $table->index(['user_id', 'starred']);
            $table->index(['user_id', 'trashed_at']);
        });
    }

    public function down(): void
    {
        Schema::table('files', function (Blueprint $table) {
            $table->dropIndex(['user_id', 'folder_id']);
            $table->dropIndex(['user_id', 'starred']);
            $table->dropIndex(['user_id', 'trashed_at']);
            $table->dropColumn(['folder_id', 'starred', 'trashed_at']);
        });
    }
};
