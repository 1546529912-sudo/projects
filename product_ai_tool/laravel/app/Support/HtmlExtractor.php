<?php

namespace App\Support;

class HtmlExtractor
{
    /**
     * Extract a single HTML document from an LLM reply (may be wrapped in fences).
     */
    public static function fromModelResponse(string $raw): ?string
    {
        $trimmed = trim($raw);

        if (preg_match('/^```(?:html)?\s*\R?([\s\S]+?)```$/m', $trimmed, $m)) {
            $inner = trim($m[1]);
            if ($inner !== '') {
                return $inner;
            }
        }

        if (preg_match('/```(?:html)?\s*([\s\S]+?)```/', $trimmed, $m)) {
            $inner = trim($m[1]);
            if ($inner !== '') {
                return $inner;
            }
        }

        if (preg_match('/^<!DOCTYPE\s+html/i', $trimmed) || preg_match('/^<html[\s>]/i', $trimmed)) {
            return $trimmed;
        }

        return null;
    }
}
