<?php

namespace App\Support;

class JsonExtractor
{
    public static function fromModelResponse(string $raw): ?array
    {
        $trimmed = trim($raw);
        if ($trimmed === '') {
            return null;
        }

        $candidates = [$trimmed];

        if (preg_match('/```(?:json)?\s*([\s\S]+?)```/i', $trimmed, $m)) {
            $candidates[] = trim($m[1]);
        }

        foreach ($candidates as $candidate) {
            $decoded = json_decode($candidate, true);
            if (is_array($decoded)) {
                return $decoded;
            }
        }

        $start = strpos($trimmed, '{');
        $end = strrpos($trimmed, '}');
        if ($start !== false && $end !== false && $end > $start) {
            $decoded = json_decode(substr($trimmed, $start, $end - $start + 1), true);
            if (is_array($decoded)) {
                return $decoded;
            }
        }

        return null;
    }
}
