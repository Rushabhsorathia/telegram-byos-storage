<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('files', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('storage_connection_id')->constrained()->cascadeOnDelete();
            $table->string('original_name');
            $table->unsignedBigInteger('size_bytes')->default(0);
            $table->string('mime_type')->nullable();
            $table->string('checksum_sha256')->nullable();
            $table->string('encryption_iv')->nullable();
            $table->string('encryption_tag')->nullable();
            $table->text('encrypted_key')->nullable();
            $table->text('key_metadata')->nullable();
            $table->unsignedInteger('total_chunks')->default(0);
            $table->unsignedBigInteger('uploaded_chunks')->default(0);
            $table->string('upload_batch_id')->nullable();
            $table->string('temp_path')->nullable();
            $table->enum('status', ['uploading', 'processing', 'complete', 'failed', 'deleted'])->default('uploading');
            $table->text('failure_reason')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('files');
    }
};
