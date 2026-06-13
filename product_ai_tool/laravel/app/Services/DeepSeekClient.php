<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use RuntimeException;

class DeepSeekClient
{
    private const SYSTEM = <<<'PROMPT'
You are an expert front-end engineer. Output exactly ONE complete HTML file that runs standalone in a browser sandbox.

Hard requirements:
- Single file only: inline <style> and <script>, no external CSS/JS URLs, no npm/build tools.
- No real backend calls, no API keys, no loading remote data. Use placeholder/local data only.
- Do not navigate to real external URLs (use in-page panels or hash-only patterns).
- The demo MUST be interactive (e.g. tabs, dialogs, toggles) using vanilla JS.
- Every logical "page" or screen must have a unique pageKey string (examples: home, detail, checkout).
- When the demo finishes initial render, call:
  window.parent.postMessage({ type: "DEMO_READY", pageKey: "<current>", demoId: demoId }, "*");
- Whenever the visible page/screen changes, call:
  window.parent.postMessage({ type: "DEMO_PAGE_CHANGE", pageKey: "<new>", demoId: demoId }, "*");
- Define const demoId = "<short id>" near the top of your script (simple alphanumeric id is fine).
- Optional: for modal/tab substates you may send DEMO_STATE_CHANGE with { type, pageKey, stateKey } — not required for MVP.
- Use Chinese UI copy if the user writes in Chinese; otherwise English is fine.

Return ONLY the HTML document text. No markdown fences, no commentary before or after.
PROMPT;

    private const DRAFT_SYSTEM = <<<'PROMPT'
You are an expert front-end engineer creating a FAST first-pass interactive demo.

Hard requirements:
- Output exactly ONE standalone HTML file with inline <style> and <script>.
- Prioritize speed: keep the structure concise, implement only the key page layout and the most important interactions first.
- Preserve pageKey and postMessage protocol support for DEMO_READY and DEMO_PAGE_CHANGE.
- Use lightweight placeholder data and avoid overly long repeated lists.
- The draft must still be clickable and demoable, but visual polish can be simplified.

Return ONLY the HTML document text. No markdown fences, no commentary before or after.
PROMPT;

    private const REFINE_SYSTEM = <<<'PROMPT'
You are an expert front-end engineer polishing an existing single-file HTML demo.

Hard requirements:
- Return exactly ONE complete standalone HTML file.
- Preserve the existing postMessage protocol, demoId usage, pageKey behavior, and major interactions.
- Improve layout completeness, interaction richness, content depth, and visual polish.
- Keep everything self-contained with inline <style> and <script> only.
- Do not remove already working behavior unless required to improve correctness.

Return ONLY the HTML document text. No markdown fences, no commentary before or after.
PROMPT;

    public function __construct(
        private ?string $apiKey,
        private string $baseUrl,
        private string $model,
    ) {}

    public static function fromConfig(): self
    {
        return new self(
            config('services.deepseek.key'),
            rtrim((string) config('services.deepseek.base'), '/'),
            (string) config('services.deepseek.model'),
        );
    }

    public function generateHtmlFromPrompt(
        string $userPrompt,
        ?string $modelOverride = null,
        ?callable $progress = null
    ): string
    {
        if ($progress) {
            $progress('info', '已准备 DeepSeek 生成提示词。');
        }

        return $this->complete(
            self::SYSTEM,
            "User request:\n{$userPrompt}\n\nBuild the interactive single HTML demo now.",
            0.35,
            $modelOverride,
            $progress
        );
    }

    public function generateDraftHtmlFromPrompt(
        string $userPrompt,
        ?string $modelOverride = null,
        ?callable $progress = null
    ): string {
        if ($progress) {
            $progress('info', '已准备首屏草稿提示词。');
        }

        return $this->complete(
            self::DRAFT_SYSTEM,
            "User request:\n{$userPrompt}\n\nBuild a fast first-pass interactive HTML demo now.",
            0.3,
            $modelOverride,
            $progress,
            true
        );
    }

    public function refineHtmlFromDraft(
        string $userPrompt,
        string $draftHtml,
        ?string $modelOverride = null,
        ?callable $progress = null
    ): string {
        if ($progress) {
            $progress('info', '已准备二阶段细化提示词。');
        }

        $userMessage = "Original request:\n{$userPrompt}\n\nCurrent draft HTML:\n```html\n{$draftHtml}\n```\n\nPolish this into a richer, production-looking interactive demo now.";

        return $this->complete(
            self::REFINE_SYSTEM,
            $userMessage,
            0.25,
            $modelOverride,
            $progress,
            true
        );
    }

    /**
     * Low-level chat completion (OpenAI-compatible).
     *
     * @throws RuntimeException when API key missing or request fails
     */
    public function complete(
        string $system,
        string $userMessage,
        float $temperature = 0.35,
        ?string $modelOverride = null,
        ?callable $progress = null,
        bool $stream = false
    ): string
    {
        if (! $this->apiKey) {
            throw new RuntimeException('DEEPSEEK_API_KEY is not configured.');
        }

        $model = $modelOverride ?: $this->model;

        $payload = [
            'model' => $model,
            'temperature' => $temperature,
            'messages' => [
                ['role' => 'system', 'content' => $system],
                ['role' => 'user', 'content' => $userMessage],
            ],
        ];
        if ($stream) {
            $payload['stream'] = true;
        }

        $maxTokens = config('services.deepseek.max_tokens');
        if ($maxTokens !== null && $maxTokens !== '' && is_numeric($maxTokens)) {
            $payload['max_tokens'] = (int) $maxTokens;
        }

        $timeout = (int) config('services.deepseek.timeout', 180);
        if ($progress) {
            $progress('info', '正在调用 DeepSeek 接口…');
            $progress('info', '模型：'.$model.'，超时：'.$timeout.' 秒。');
        }

        $request = Http::withToken($this->apiKey)
            ->withOptions(['stream' => $stream])
            ->accept($stream ? 'text/event-stream' : 'application/json')
            ->timeout($timeout)
            ->post("{$this->baseUrl}/chat/completions", $payload);

        if ($progress) {
            $progress('info', 'DeepSeek 已返回响应，HTTP '.$request->status().'。');
        }

        if (! $request->successful()) {
            throw new RuntimeException(
                'DeepSeek HTTP '.$request->status().': '.$request->body()
            );
        }

        if ($stream) {
            return $this->readStreamedContent($request, $progress);
        }

        $content = data_get($request->json(), 'choices.0.message.content');
        if (! is_string($content) || $content === '') {
            throw new RuntimeException('DeepSeek returned empty content.');
        }

        if ($progress) {
            $progress('info', '已取得模型输出，长度 '.mb_strlen($content).' 字符。');
        }

        return $content;
    }

    private function readStreamedContent($response, ?callable $progress = null): string
    {
        $body = $response->toPsrResponse()->getBody();
        $buffer = '';
        $content = '';
        $lastReported = 0;

        while (! $body->eof()) {
            $buffer .= str_replace("\r\n", "\n", $body->read(4096));

            while (($boundary = strpos($buffer, "\n\n")) !== false) {
                $rawEvent = substr($buffer, 0, $boundary);
                $buffer = substr($buffer, $boundary + 2);

                foreach (preg_split("/\r?\n/", trim($rawEvent)) as $line) {
                    if (! str_starts_with($line, 'data:')) {
                        continue;
                    }

                    $data = trim(substr($line, 5));
                    if ($data === '' || $data === '[DONE]') {
                        continue;
                    }

                    $json = json_decode($data, true);
                    if (! is_array($json)) {
                        continue;
                    }

                    $delta = data_get($json, 'choices.0.delta.content');
                    if (is_string($delta) && $delta !== '') {
                        $content .= $delta;

                        if ($progress && (mb_strlen($content) - $lastReported >= 1200 || str_contains($delta, "\n"))) {
                            $lastReported = mb_strlen($content);
                            $progress('stream', $delta, [
                                'stream_total_chars' => $lastReported,
                            ]);
                        }
                    }
                }
            }
        }

        $buffer = trim($buffer);
        if ($buffer !== '') {
            foreach (preg_split("/\n+/", $buffer) as $line) {
                if (! str_starts_with($line, 'data:')) {
                    continue;
                }
                $data = trim(substr($line, 5));
                if ($data === '' || $data === '[DONE]') {
                    continue;
                }
                $json = json_decode($data, true);
                $delta = data_get($json, 'choices.0.delta.content');
                if (is_string($delta) && $delta !== '') {
                    $content .= $delta;
                }
            }
        }

        if ($progress) {
            $progress('info', '已取得模型输出，长度 '.mb_strlen($content).' 字符。');
        }

        if ($content === '') {
            throw new RuntimeException('DeepSeek returned empty streamed content.');
        }

        return $content;
    }
}
