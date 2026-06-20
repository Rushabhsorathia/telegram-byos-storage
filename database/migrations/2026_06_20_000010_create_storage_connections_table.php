<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('storage_connections', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('label')->nullable();
            $table->string('bot_username')->nullable();
            $table->text('bot_token');
            $table->string('chat_id');
            $table->string('chat_title')->nullable();
            $table->enum('status', ['pending', 'active', 'failed'])->default('pending');
            $table->text('last_error')->nullable();
            $table->timestamp('verified_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('storage_connections');
    }
};
