<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;

class MediaStorageService
{
    private const ALLOWED = [
        'image/jpeg' => '.jpg',
        'image/png' => '.png',
        'image/webp' => '.webp',
        'video/mp4' => '.mp4',
        'video/webm' => '.webm',
    ];

    public function decodeDataUrl(string $dataUrl): array
    {
        if (!preg_match('/^data:([^;]+);base64,([A-Za-z0-9+\/=\r\n]+)$/', $dataUrl, $match)) {
            throw new RuntimeException('Invalid attachment data URL.');
        }

        $mime = strtolower(trim($match[1]));
        if (!isset(self::ALLOWED[$mime])) {
            throw new RuntimeException('Only JPG, PNG, WebP, MP4, or WebM files are allowed.');
        }

        $binary = base64_decode($match[2], true);
        if ($binary === false || strlen($binary) < 1 || strlen($binary) > 10 * 1024 * 1024) {
            throw new RuntimeException('Each attachment must be between 1 byte and 10 MB.');
        }

        $this->assertSignature($mime, $binary);

        return [
            'mime' => $mime,
            'extension' => self::ALLOWED[$mime],
            'binary' => $binary,
            'size' => strlen($binary),
        ];
    }

    public function storeBinary(string $binary, string $extension, ?string $originalName = null): array
    {
        $id = (string) Str::uuid();
        $fileName = $id.$extension;
        Storage::disk('kaila_uploads')->put($fileName, $binary);

        return [
            'id' => $id,
            'file_name' => $fileName,
            'original_name' => $this->sanitizeName($originalName, $extension, $id),
        ];
    }

    public function storeUploaded(UploadedFile $file): array
    {
        $mime = strtolower((string) $file->getMimeType());
        if (!isset(self::ALLOWED[$mime])) {
            throw new RuntimeException('Unsupported media type.');
        }

        return $this->storeBinary(
            file_get_contents($file->getRealPath()),
            self::ALLOWED[$mime],
            $file->getClientOriginalName()
        );
    }

    public function storeDataUrls(array $attachments, int $max = 6): array
    {
        if (count($attachments) > $max) {
            throw new RuntimeException("Upload up to {$max} attachments.");
        }

        $saved = [];
        foreach ($attachments as $attachment) {
            $decoded = $this->decodeDataUrl((string) ($attachment['dataUrl'] ?? $attachment['data_url'] ?? ''));
            $stored = $this->storeBinary($decoded['binary'], $decoded['extension'], $attachment['name'] ?? null);
            $saved[] = [...$stored, 'mime_type' => $decoded['mime'], 'size_bytes' => $decoded['size']];
        }

        return $saved;
    }

    public function attachToRequest(int $requestId, string $stage, array $attachments): array
    {
        $rows = [];
        foreach ($this->storeDataUrls($attachments) as $item) {
            DB::table('request_attachments')->insert([
                'id' => $item['id'],
                'service_request_id' => $requestId,
                'stage' => $stage,
                'file_name' => $item['file_name'],
                'original_name' => $item['original_name'],
                'mime_type' => $item['mime_type'],
                'size_bytes' => $item['size_bytes'],
                'created_at' => now(),
            ]);
            $rows[] = $this->mapRow('request', $item);
        }

        return $rows;
    }

    public function attachToJobMessage(int $messageId, array $attachments): array
    {
        $rows = [];
        foreach ($this->storeDataUrls($attachments) as $item) {
            DB::table('job_message_attachments')->insert([
                'id' => $item['id'],
                'job_message_id' => $messageId,
                'file_name' => $item['file_name'],
                'original_name' => $item['original_name'],
                'mime_type' => $item['mime_type'],
                'size_bytes' => $item['size_bytes'],
                'created_at' => now(),
            ]);
            $rows[] = $this->mapRow('message', $item);
        }

        return $rows;
    }

    public function attachToFeedPost(int $postId, array $attachments): array
    {
        $rows = [];
        foreach ($this->storeDataUrls($attachments, 4) as $item) {
            DB::table('feed_post_media')->insert([
                'id' => $item['id'],
                'feed_post_id' => $postId,
                'file_name' => $item['file_name'],
                'original_name' => $item['original_name'],
                'mime_type' => $item['mime_type'],
                'size_bytes' => $item['size_bytes'],
                'created_at' => now(),
            ]);
            $rows[] = $this->mapRow('feed', $item);
        }

        return $rows;
    }

    public function attachToDirectMessage(int $messageId, array $attachments): array
    {
        $rows = [];
        foreach ($this->storeDataUrls($attachments) as $item) {
            DB::table('direct_message_attachments')->insert([
                'id' => $item['id'],
                'direct_message_id' => $messageId,
                'file_name' => $item['file_name'],
                'original_name' => $item['original_name'],
                'mime_type' => $item['mime_type'],
                'size_bytes' => $item['size_bytes'],
                'created_at' => now(),
            ]);
            $rows[] = $this->mapRow('direct', $item);
        }

        return $rows;
    }

    public function read(string $fileName): ?array
    {
        if (!Storage::disk('kaila_uploads')->exists($fileName)) {
            return null;
        }

        return [
            'binary' => Storage::disk('kaila_uploads')->get($fileName),
            'mime' => $this->mimeFromFileName($fileName),
        ];
    }

    public function mapRow(string $type, array $item): array
    {
        $route = match ($type) {
            'request' => 'media.show',
            'message' => 'message-media.show',
            'direct' => 'direct-media.show',
            'feed' => 'feed-media.show',
            default => 'media.show',
        };

        return [
            'id' => $item['id'],
            'url' => route($route, $item['id']),
            'originalName' => $item['original_name'],
            'mimeType' => $item['mime_type'] ?? null,
        ];
    }

    private function sanitizeName(?string $name, string $extension, string $id): string
    {
        $slug = Str::slug(pathinfo((string) $name, PATHINFO_FILENAME)) ?: 'attachment';

        return Str::limit($slug, 48, '').'-'.substr(str_replace('-', '', $id), 0, 8).$extension;
    }

    private function mimeFromFileName(string $fileName): string
    {
        return match (strtolower(pathinfo($fileName, PATHINFO_EXTENSION))) {
            'jpg', 'jpeg' => 'image/jpeg',
            'png' => 'image/png',
            'webp' => 'image/webp',
            'mp4' => 'video/mp4',
            'webm' => 'video/webm',
            default => 'application/octet-stream',
        };
    }

    private function assertSignature(string $mime, string $binary): void
    {
        $ok = match ($mime) {
            'image/jpeg' => str_starts_with($binary, "\xFF\xD8\xFF"),
            'image/png' => str_starts_with($binary, "\x89PNG\r\n\x1a\n"),
            'image/webp' => str_starts_with($binary, 'RIFF') && substr($binary, 8, 4) === 'WEBP',
            'video/mp4' => substr($binary, 4, 4) === 'ftyp',
            'video/webm' => str_starts_with($binary, "\x1a\x45\xDF\xA3"),
            default => false,
        };

        if (!$ok) {
            throw new RuntimeException('Attachment content does not match its media type.');
        }
    }
}
