<?php

namespace App\Http\Controllers;

use App\Models\Demo;
use App\Services\DemoGenerationService;
use App\Services\DemoRegenerationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\View\View;
use Symfony\Component\HttpFoundation\StreamedResponse;

class WorkbenchController extends Controller
{
    public function index(Request $request): View|RedirectResponse
    {
        if (! $request->filled('demo')) {
            $lastId = session('last_workbench_demo_id');
            if ($lastId) {
                if (Demo::query()->whereKey($lastId)->exists()) {
                    return redirect()->route('workbench.index', ['demo' => $lastId]);
                }
                session()->forget('last_workbench_demo_id');
            }
        }

        $demo = null;
        if ($request->filled('demo')) {
            $demo = Demo::with('currentVersion')
                ->withCount('annotations')
                ->find($request->integer('demo'));
            if ($demo) {
                session(['last_workbench_demo_id' => $demo->id]);
            } else {
                session()->forget('last_workbench_demo_id');
            }
        }

        return view('workbench.index', [
            'demo' => $demo,
            'previewUrl' => $demo ? route('demos.preview', $demo) : null,
            'availableModels' => array_values((array) config('services.deepseek.models', [])),
            'defaultModel' => $demo?->model ?: (string) config('services.deepseek.model'),
            'shouldAutoRefine' => $request->boolean('autorefine') && $demo !== null,
        ]);
    }

    public function regenerate(Request $request, Demo $demo, DemoRegenerationService $regeneration): RedirectResponse
    {
        $hasAnnotations = $demo->annotations()->exists();

        $rules = [
            'prompt' => ['required', 'string', 'max:20000'],
        ];
        if ($hasAnnotations) {
            $rules['confirm_regenerate'] = ['required', 'accepted'];
        }

        $validated = $request->validate($rules);

        $regeneration->regenerate($demo, $validated['prompt']);

        return redirect()
            ->route('workbench.index', ['demo' => $demo->id])
            ->with('status', '已在当前 Demo 上生成新版本。');
    }

    public function storeStream(Request $request, DemoGenerationService $generation): StreamedResponse|JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'title' => ['nullable', 'string', 'max:255'],
            'prompt' => ['required', 'string', 'max:20000'],
            'model' => ['required', 'string', 'in:deepseek-v4-flash,deepseek-v4-pro'],
        ]);
        if ($validator->fails()) {
            return response()->json([
                'message' => '提交参数校验失败。',
                'errors' => $validator->errors(),
            ], 422);
        }
        $validated = $validator->validated();

        return $this->streamProgress(function (callable $send) use ($validated, $generation) {
            $demo = $generation->createInitialDraftDemo(
                $validated['title'] ?? null,
                $validated['prompt'],
                $validated['model'],
                $send
            );

            $shouldAutoRefine = (bool) config('services.deepseek.key');

            $send('done', $shouldAutoRefine ? '草稿 Demo 已生成，准备进入预览并自动细化。' : '草稿 Demo 已生成。', [
                'demo_id' => $demo->id,
                'redirect_url' => route('workbench.index', ['demo' => $demo->id] + ($shouldAutoRefine ? ['autorefine' => 1] : [])),
                'auto_refine' => $shouldAutoRefine,
            ]);
        });
    }

    public function store(Request $request, DemoGenerationService $generation): RedirectResponse
    {
        $validated = $request->validate([
            'title' => ['nullable', 'string', 'max:255'],
            'prompt' => ['required', 'string', 'max:20000'],
            'model' => ['required', 'string', 'in:deepseek-v4-flash,deepseek-v4-pro'],
        ]);

        $demo = $generation->createInitialDemo(
            $validated['title'] ?? null,
            $validated['prompt'],
            $validated['model']
        );

        return redirect()
            ->route('workbench.index', ['demo' => $demo->id])
            ->with('status', 'Demo 已生成。');
    }

    public function regenerateStream(
        Request $request,
        Demo $demo,
        DemoRegenerationService $regeneration
    ): StreamedResponse|JsonResponse {
        $hasAnnotations = $demo->annotations()->exists();

        $rules = [
            'prompt' => ['required', 'string', 'max:20000'],
        ];
        if ($hasAnnotations) {
            $rules['confirm_regenerate'] = ['required', 'accepted'];
        }

        $validator = Validator::make($request->all(), $rules);
        if ($validator->fails()) {
            return response()->json([
                'message' => '提交参数校验失败。',
                'errors' => $validator->errors(),
            ], 422);
        }
        $validated = $validator->validated();

        return $this->streamProgress(function (callable $send) use ($demo, $validated, $regeneration) {
            $regeneration->regenerate(
                $demo,
                $validated['prompt'],
                null,
                $send
            );

            $send('done', '新版本已生成，准备刷新预览。', [
                'demo_id' => $demo->id,
                'redirect_url' => route('workbench.index', ['demo' => $demo->id]),
            ]);
        });
    }

    public function refineDraftStream(Demo $demo, DemoGenerationService $generation): StreamedResponse
    {
        return $this->streamProgress(function (callable $send) use ($demo, $generation) {
            $demo = $generation->refineInitialDraftDemo($demo, $send);

            $send('done', '细化完成，预览已准备刷新。', [
                'demo_id' => $demo->id,
                'refresh_preview' => true,
            ]);
        });
    }

    private function streamProgress(callable $runner): StreamedResponse
    {
        return response()->stream(function () use ($runner) {
            $emit = function (string $event, string $message, array $extra = []): void {
                echo 'event: '.$event."\n";
                echo 'data: '.json_encode(array_merge([
                    'message' => $message,
                    'timestamp' => now()->format('H:i:s'),
                ], $extra), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)."\n\n";

                if (function_exists('ob_flush')) {
                    @ob_flush();
                }
                flush();
            };

            $emit('log', '已建立生成通道。');

            try {
                $runner(function (string $level, string $message, array $extra = []) use ($emit): void {
                    $event = match ($level) {
                        'done' => 'done',
                        'stream' => 'chunk',
                        default => 'log',
                    };
                    $emit($event, $message, array_merge(['level' => $level], $extra));
                });
            } catch (\Throwable $e) {
                report($e);
                $emit('error', $e->getMessage(), ['level' => 'error']);
            }
        }, 200, [
            'Content-Type' => 'text/event-stream',
            'Cache-Control' => 'no-cache, no-transform',
            'X-Accel-Buffering' => 'no',
            'Connection' => 'keep-alive',
        ]);
    }
}
