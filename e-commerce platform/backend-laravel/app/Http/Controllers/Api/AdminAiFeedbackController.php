<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AiFeedback;
use App\Models\AiMessage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * 后台 Bad Case · iter-13
 *
 * - GET  /api/v1/admin/ai/feedbacks?rating=bad|good|all&labeled=0|1|all&source=manual|auto_transfer
 * - POST /api/v1/admin/ai/feedbacks/{id}/label  标注 tags → 标记 labeled
 * - GET  /api/v1/admin/ai/feedbacks/stats        聚类统计（按 source / tags）
 */
class AdminAiFeedbackController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $rating = $request->input('rating', 'bad');
        $labeled = $request->input('labeled', '0');
        $source = $request->input('source');
        $perPage = (int) $request->input('per_page', 20);

        $q = AiFeedback::with(['message', 'conversation'])->latest();

        if ($rating !== 'all') $q->where('rating', $rating);
        if ($labeled !== 'all' && $labeled !== null) $q->where('labeled', (int) $labeled);
        if ($source) $q->where('source', $source);

        $page = $q->paginate($perPage);

        return $this->ok([
            'items' => array_map(fn ($f) => $this->toJson($f), $page->items()),
            'total' => $page->total(),
            'page' => $page->currentPage(),
            'per_page' => $page->perPage(),
            'unlabeled_bad_count' => AiFeedback::where('rating', 'bad')->where('labeled', 0)->count(),
        ]);
    }

    public function label(Request $request, int $id): JsonResponse
    {
        $data = $request->validate([
            'tags' => 'required|array|min:1',
            'tags.*' => 'string|max:64',
            'correct_answer' => 'nullable|string|max:5000',  // iter-15
            'if_match' => 'nullable|string',                  // iter-26 乐观锁
        ]);

        $fb = AiFeedback::findOrFail($id);

        // iter-26：若客户端带了 if_match（加载时的 updated_at），与当前 DB 不一致 → 409
        // 不带 if_match 视为客户端不参与锁（脚本/低版本），跳过检查保持兼容
        if (! empty($data['if_match'])) {
            $serverUpdatedAt = (string) ($fb->updated_at?->format('Y-m-d\TH:i:s.uP') ?? '');
            if ($serverUpdatedAt !== $data['if_match']) {
                return response()->json([
                    'code' => 1090,
                    'message' => '此条记录已被他人修改，请刷新后再操作',
                    'data' => ['current' => $this->toJson($fb->load(['message', 'conversation']))],
                ], 409);
            }
        }

        $fb->update([
            'tags' => $data['tags'],
            'correct_answer' => $data['correct_answer'] ?? null,
            'labeled' => true,
            'labeled_at' => now(),
            'labeled_by' => $request->user()->id,
        ]);

        return $this->ok(['feedback' => $this->toJson($fb->fresh(['message', 'conversation']))]);
    }

    public function stats(): JsonResponse
    {
        $bySource = AiFeedback::selectRaw('source, count(*) as c')
            ->where('rating', 'bad')->groupBy('source')->pluck('c', 'source');

        // 简化 tag 聚类（SQLite/MySQL JSON 不易聚合，PHP 端展开）
        $byTag = [];
        AiFeedback::where('rating', 'bad')->whereNotNull('tags')->get()->each(function ($fb) use (&$byTag) {
            foreach (($fb->tags ?? []) as $t) {
                $byTag[$t] = ($byTag[$t] ?? 0) + 1;
            }
        });
        arsort($byTag);

        return $this->ok([
            'by_source' => $bySource,
            'by_tag' => $byTag,
            'unlabeled_bad' => AiFeedback::where('rating', 'bad')->where('labeled', 0)->count(),
            'total_bad' => AiFeedback::where('rating', 'bad')->count(),
            // iter-15：已写正确答案 → 可直接进训练集
            'training_ready' => AiFeedback::where('rating', 'bad')
                ->whereNotNull('correct_answer')->where('correct_answer', '!=', '')->count(),
        ]);
    }

    /**
     * iter-14 · CSV 导出（运营/PM 看）
     * GET /admin/ai/feedbacks/export.csv?rating=bad&labeled=1
     */
    public function exportCsv(Request $request): StreamedResponse
    {
        $rating = $request->input('rating', 'bad');
        $labeled = $request->input('labeled', 'all');

        $q = AiFeedback::query()->latest();
        if ($rating !== 'all') $q->where('rating', $rating);
        if ($labeled !== 'all') $q->where('labeled', (int) $labeled);

        $filename = sprintf('ai-feedbacks-%s.csv', now()->format('Ymd-His'));

        return response()->streamDownload(function () use ($q) {
            $out = fopen('php://output', 'w');
            // UTF-8 BOM 让 Excel 打开不乱码
            fwrite($out, "\xEF\xBB\xBF");
            fputcsv($out, [
                'feedback_id', 'conversation_id', 'message_id',
                'created_at', 'rating', 'source', 'reason', 'tags',
                'user_question', 'ai_reply', 'correct_answer',
                'labeled', 'labeled_at',
            ]);

            $q->chunk(200, function ($fbs) use ($out) {
                foreach ($fbs as $f) {
                    [$user, $ai] = $this->turnFor($f);
                    fputcsv($out, [
                        $f->id, $f->conversation_id, $f->message_id,
                        $f->created_at?->toDateTimeString(),
                        $f->rating, $f->source,
                        $f->reason ?? '',
                        implode(';', $f->tags ?? []),
                        $user?->content ?? '',
                        $ai?->content ?? '',
                        $f->correct_answer ?? '',
                        (int) $f->labeled,
                        $f->labeled_at?->toDateTimeString() ?? '',
                    ]);
                }
            });
            fclose($out);
        }, $filename, [
            'Content-Type' => 'text/csv; charset=UTF-8',
        ]);
    }

    /**
     * iter-14 · JSONL 训练集起点（ML 工程师拉去做 prompt review / fine-tuning 起草）
     * GET /admin/ai/feedbacks/export.jsonl?rating=bad&labeled=1
     *
     * 每行一个样本：
     *   {"feedback_id":..., "rating":..., "tags":[...], "messages":[{role,content}...], "reason":..., "correct_answer":null}
     * correct_answer 留空，由 ML 工程师在外部数据集中补全（这是"起草"，不是即用训练集）。
     */
    public function exportJsonl(Request $request): StreamedResponse
    {
        $rating = $request->input('rating', 'bad');
        $labeled = $request->input('labeled', 'all');

        $q = AiFeedback::query()->latest();
        if ($rating !== 'all') $q->where('rating', $rating);
        if ($labeled !== 'all') $q->where('labeled', (int) $labeled);

        $filename = sprintf('ai-feedbacks-%s.jsonl', now()->format('Ymd-His'));

        return response()->streamDownload(function () use ($q) {
            $out = fopen('php://output', 'w');
            $q->chunk(200, function ($fbs) use ($out) {
                foreach ($fbs as $f) {
                    [$user, $ai] = $this->turnFor($f);
                    $bad = $ai?->content;
                    $correct = $f->correct_answer;
                    // iter-15：correct_answer 优先（直接是训练目标）；否则 fallback 用 bad，便于人工 review
                    $assistantContent = $correct ?? $bad;
                    $row = [
                        'feedback_id' => $f->id,
                        'rating' => $f->rating,
                        'source' => $f->source,
                        'tags' => $f->tags ?? [],
                        'reason' => $f->reason,
                        'messages' => array_values(array_filter([
                            $user ? ['role' => 'user', 'content' => $user->content] : null,
                            $assistantContent !== null ? ['role' => 'assistant', 'content' => $assistantContent] : null,
                        ])),
                        'bad_reply' => $bad,
                        'correct_answer' => $correct,
                        'is_training_ready' => $correct !== null,
                    ];
                    fwrite($out, json_encode($row, JSON_UNESCAPED_UNICODE) . "\n");
                }
            });
            fclose($out);
        }, $filename, [
            'Content-Type' => 'application/x-ndjson; charset=UTF-8',
        ]);
    }

    /** 找出该 feedback 对应的"用户提问 + AI 回复"对（用户消息 = 同对话中 ai 消息之前的最后一条 user 消息）。 */
    private function turnFor(AiFeedback $f): array
    {
        $ai = AiMessage::find($f->message_id);
        if (! $ai) return [null, null];
        $user = AiMessage::where('conversation_id', $f->conversation_id)
            ->where('id', '<', $f->message_id)
            ->where('sender_type', 'user')
            ->latest('id')
            ->first();
        return [$user, $ai];
    }

    private function toJson(AiFeedback $f): array
    {
        return [
            'id' => $f->id,
            'message_id' => $f->message_id,
            'conversation_id' => $f->conversation_id,
            'user_id' => $f->user_id,
            'rating' => $f->rating,
            'source' => $f->source,
            'reason' => $f->reason,
            'correct_answer' => $f->correct_answer,
            'tags' => $f->tags,
            'labeled' => $f->labeled,
            'labeled_at' => $f->labeled_at?->toIso8601String(),
            'labeled_by' => $f->labeled_by,
            'message_content' => $f->message?->content,
            'created_at' => $f->created_at?->toIso8601String(),
            'updated_at' => $f->updated_at?->format('Y-m-d\TH:i:s.uP'),  // iter-26 乐观锁：微秒精度
        ];
    }

    private function ok(array $data): JsonResponse
    {
        return response()->json(['code' => 0, 'message' => 'ok', 'data' => $data]);
    }
}
