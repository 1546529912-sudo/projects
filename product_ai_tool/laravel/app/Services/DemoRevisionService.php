<?php

namespace App\Services;

use App\Models\Annotation;
use App\Models\DemoVersion;
use App\Support\HtmlExtractor;
use Illuminate\Support\Facades\DB;
use RuntimeException;
use Throwable;

class DemoRevisionService
{
    private const REVISION_SYSTEM = <<<'PROMPT'
You are an expert front-end engineer. You will receive ONE complete HTML file and an annotation task.

Hard requirements for your output:
- Return exactly ONE complete updated HTML file (inline <style> and <script> only).
- Same constraints as initial demo: no external URLs for assets, no real APIs, postMessage to parent with DEMO_READY and DEMO_PAGE_CHANGE when appropriate, unique pageKey per screen, const demoId preserved or reasonably updated.
- Apply the annotation feedback to the demo UI/content without removing unrelated behavior unless necessary.

Return ONLY the full HTML document. No markdown fences, no commentary.
PROMPT;

    public function __construct(
        private DeepSeekClient $client,
        private RequirementScopeService $scopeService,
    ) {}

    /**
     * Create a new demo_version from current HTML + annotation. Marks annotation 已完成.
     * On model failure throws; caller must not advance version.
     *
     * @throws RuntimeException|Throwable
     */
    public function reviseFromAnnotation(Annotation $annotation, ?string $userInstruction = null): DemoVersion
    {
        $annotation->loadMissing('demo');
        $demo = $annotation->demo;
        $demo->loadMissing('currentVersion');
        if (! $demo->currentVersion) {
            throw new RuntimeException('Demo has no current version.');
        }

        $html = $demo->currentVersion->html_code;
        if ($html === '' || $html === null) {
            throw new RuntimeException('Current HTML is empty.');
        }

        $stateKeyLine = $annotation->state_key ? "stateKey: {$annotation->state_key}\n" : '';

        $userBlock = <<<TXT
demoId (DB): {$demo->id}
annotation id: {$annotation->id}
pageKey: {$annotation->page_key}
{$stateKeyLine}pin position (percent of viewport): x={$annotation->x_percent}, y={$annotation->y_percent}
annotation type: {$annotation->type}
annotation title: {$annotation->title}
annotation description:
{$annotation->description}

Additional instruction from user:
{$userInstruction}

Below is the CURRENT full HTML to modify:
TXT;

        $userMessage = $userBlock."\n```html\n{$html}\n```";

        if (! config('services.deepseek.key')) {
            throw new RuntimeException('DEEPSEEK_API_KEY is not configured.');
        }

        $selectedModel = $demo->model ?: (string) config('services.deepseek.model');
        $scope = is_array($demo->requirement_scope_json) && $demo->requirement_scope_json !== []
            ? $demo->requirement_scope_json
            : $this->scopeService->analyze($demo->prompt, $selectedModel);

        if (! $demo->requirement_scope_json) {
            $demo->update(['requirement_scope_json' => $scope]);
        }

        $raw = $this->client->complete(
            self::REVISION_SYSTEM,
            $userMessage."\n\n".$this->scopeService->buildGenerationContract($scope),
            0.25,
            $selectedModel
        );
        $newHtml = HtmlExtractor::fromModelResponse($raw);
        if ($newHtml === null && trim((string) $raw) !== '') {
            $newHtml = trim((string) $raw);
        }
        if ($newHtml === null || $newHtml === '') {
            throw new RuntimeException('Model returned no usable HTML.');
        }

        return DB::transaction(function () use ($demo, $newHtml, $annotation, $userInstruction, $selectedModel) {
            $nextNo = (int) $demo->versions()->max('version_no') + 1;

            $version = $demo->versions()->create([
                'version_no' => $nextNo,
                'html_code' => $newHtml,
                'model' => $selectedModel,
                'source_type' => 'annotation_revision',
                'source_annotation_id' => $annotation->id,
                'prompt' => $userInstruction ?? $annotation->title,
            ]);

            $demo->update(['current_version_id' => $version->id]);
            $annotation->update(['status' => '已完成']);

            return $version;
        });
    }
}
