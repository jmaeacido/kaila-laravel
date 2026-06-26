<?php

namespace App\Services;

use RuntimeException;

class MessageEncryptionService
{
    private readonly string $key;

    public function __construct()
    {
        $hex = (string) config('kaila.message_encryption_key');
        if (strlen($hex) !== 64 || !ctype_xdigit($hex)) {
            throw new RuntimeException('KAILA_MESSAGE_ENCRYPTION_KEY must be a 64-character hex string.');
        }
        $this->key = hex2bin($hex);
    }

    public function encrypt(string $plainText, string|int $messageId): string
    {
        $plainText = (string) $plainText;
        if ($plainText === '') {
            return $plainText;
        }

        if (str_starts_with($plainText, 'enc:v1:')) {
            return $plainText;
        }

        $iv = random_bytes(12);
        $tag = '';
        $cipher = openssl_encrypt(
            $plainText,
            'aes-256-gcm',
            $this->key,
            OPENSSL_RAW_DATA,
            $iv,
            $tag,
            (string) $messageId,
            16
        );

        if ($cipher === false) {
            throw new RuntimeException('Unable to encrypt message.');
        }

        return 'enc:v1:'
            .base64_encode($iv).':'
            .base64_encode($tag).':'
            .base64_encode($cipher);
    }

    public function decrypt(string $stored, string|int $messageId): string
    {
        $stored = (string) $stored;
        if ($stored === '' || !str_starts_with($stored, 'enc:v1:')) {
            return $stored;
        }

        [, , $iv, $tag, $encrypted] = explode(':', $stored, 5);
        $plain = openssl_decrypt(
            base64_decode($encrypted, true),
            'aes-256-gcm',
            $this->key,
            OPENSSL_RAW_DATA,
            base64_decode($iv, true),
            base64_decode($tag, true),
            (string) $messageId
        );

        return $plain === false ? '' : $plain;
    }
}
