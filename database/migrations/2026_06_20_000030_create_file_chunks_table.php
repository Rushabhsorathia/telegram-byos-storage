<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('file_chunks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('file_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('chunk_index');
            $table->unsignedBigInteger('size_bytes')->default(0);
            $table->string('checksum_sha256')->nullable();
            $table->string('telegram_message_id')->nullable();
            $table->enum('status', ['pending', 'uploaded', 'failed'])->default('pending');
            $table->unsignedInteger('attempts')->default(0);
            $table->text('last_error')->nullable();
            $table->timestamps();

            $table->index(['file_id', 'chunk_index']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('file_chunks');
    }
};
