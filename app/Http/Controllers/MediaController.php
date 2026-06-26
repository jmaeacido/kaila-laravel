<?php

namespace App\Http\Controllers;

use App\Services\MediaStorageService;
use Symfony\Component\HttpFoundation\Response;

class MediaController extends Controller
{
    public function __construct(private readonly MediaStorageService $media)
    {
    }

    public function requestMedia(string $id)
    {
        return $this->serve('request_attachments', $id);
    }

    public function messageMedia(string $id)
    {
        return $this->serve('job_message_attachments', $id);
    }

    public function feedMedia(string $id)
    {
        return $this->serve('feed_post_media', $id);
    }

    public function directMedia(string $id)
    {
        return $this->serve('direct_message_attachments', $id);
    }

    private function serve(string $table, string $id): Response
    {
        $row = \Illuminate\Support\Facades\DB::table($table)->where('id', $id)->first();
        abort_unless($row, 404);

        $payload = $this->media->read($row->file_name);
        abort_unless($payload, 404);

        return response($payload['binary'], 200, [
            'Content-Type' => $row->mime_type ?? $payload['mime'],
            'Cache-Control' => 'private, max-age=86400',
        ]);
    }
}
