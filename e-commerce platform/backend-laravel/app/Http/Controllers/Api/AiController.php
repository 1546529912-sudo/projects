<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AiConversation;
use App\Models\AiFeedback;
use App\Models\AiMessage;
use App\Models\AiQuotation;
use App\Models\Cart;
use App\Models\CartItem;
use App\Models\Sku;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;

/**
 * AI Controller · AI-001 / AI-002
 *
 * 鉴权后转发到 FastAPI AI Service，并持久化消息与报价单到 MySQL。
 */
class AiController extends Controller
{
    // POST /api/v1/ai/conversations · 创建对话
    public function createConversation(Request $request): JsonResponse
    {
        $data = $request->validate([
            'source' => 'required|in:detail_page,global_chat,inquiry_form,floating',
            'product_id' => 'nullable|integer',
            'sku_id' => 'nullable|integer',
        ]);

        $context = [];
        if (! empty($data['product_id'])) $context['product_id'] = $data['product_id'];
        if (! empty($data['sku_id'])) $context['sku_id'] = $data['sku_id'];

        $conv = AiConversation::create([
            'user_id' => $request->user()->id,
            'session_id' => bin2hex(random_bytes(16)),
            'source' => $data['source'],
            'context_json' => $context ?: null,
        ]);

        return $this->ok(['conversation' => $conv]);
    }

    // GET /api/v1/ai/conversations/{id}
    public function getConversation(Request $request, int $id): JsonResponse
    {
        $conv = AiConversation::with(['messages' => fn ($q) => $q->oldest()])
            ->where('user_id', $request->user()->id)
            ->findOrFail($id);
        return $this->ok(['conversation' => $conv]);
    }

    // POST /api/v1/ai/conversations/{id}/messages · 发送一条用户消息，同步返回 AI 回复
    public function sendMessage(Request $request, int $id): JsonResponse
    {
        $data = $request->validate(['content' => 'required|string|max:2000']);

        $conv = AiConversation::where('user_id', $request->user()->id)->findOrFail($id);
        if ($conv->transferred) {
            return $this->fail(1701, '该对话已转人工，请通过工单跟进', 422);
        }

        // 1. 持久化用户消息
        $userMsg = AiMessage::create([
            'conversation_id' => $conv->id,
            'sender_type' => 'user',
            'content' => $data['content'],
        ]);

        // 2. 把最近 20 条上下文传给 FastAPI
        $context = $conv->messages()->oldest()->take(20)->get()
            ->map(fn ($m) => ['role' => $m->sender_type, 'content' => $m->content])
            ->values()
            ->toArray();

        try {
            $res = Http::timeout(config('services.ai.timeout', 10))
                ->post($this->aiUrl('/chat/turn'), [
                    'conversation_id' => $conv->id,
                    'user_id' => $conv->user_id,
                    'user_message' => $data['content'],
                    'context_messages' => $context,
                    'context_json' => $conv->context_json,
                ]);
        } catch (\Throwable $e) {
            $ai = $this->fallbackReply('AI 服务暂时繁忙，已为您转接人工客服');
            $aiMsg = $this->persistAiMessage($conv, $ai);
            $conv->update(['transferred' => true, 'transferred_at' => now()]);
            return $this->ok($this->turnView($conv, $userMsg, $aiMsg));
        }

        if (! $res->successful()) {
            $ai = $this->fallbackReply('AI 服务异常，请稍后再试');
            $aiMsg = $this->persistAiMessage($conv, $ai);
            return $this->ok($this->turnView($conv, $userMsg, $aiMsg));
        }

        $ai = $res->json();
        $aiMsg = $this->persistAiMessage($conv, $ai);

        // 3. 如果是报价类，可能附带 quotation 数据 → 生成 ai_quotations 记录
        $quotation = null;
        if (! empty($ai['quotation']) && ! empty($ai['quotation']['items'])) {
            $quotation = $this->createQuotation($conv, $ai['quotation']);
            $aiMsg->update([
                'meta' => array_merge($aiMsg->meta ?? [], ['quotation_id' => $quotation->id, 'quotation_no' => $quotation->quotation_no]),
            ]);
        }

        // 4. 更新对话上下文
        if (! empty($ai['intent'])) $conv->intent = $ai['intent'];
        if (! empty($ai['context_patch'])) {
            $conv->context_json = array_merge($conv->context_json ?? [], $ai['context_patch']);
        }
        $transferred = ! empty($ai['transfer_to_human']);
        if ($transferred) {
            $conv->transferred = true;
            $conv->transferred_at = now();
            // iter-13：转人工 = 一个 bad case，自动入库供后台聚类
            AiFeedback::create([
                'message_id' => $aiMsg->id,
                'conversation_id' => $conv->id,
                'user_id' => $conv->user_id,
                'rating' => 'bad',
                'source' => 'auto_transfer',
                'reason' => 'AI 触发转人工，自动收集',
            ]);
        }

        // iter-16：confidence 低于阈值 → 自动 bad case。已转人工时跳过避免双重入库。
        $threshold = (float) config('services.ai.lowconf_threshold', 0);
        if (! $transferred
            && $threshold > 0
            && $aiMsg->confidence !== null
            && (float) $aiMsg->confidence < $threshold) {
            AiFeedback::create([
                'message_id' => $aiMsg->id,
                'conversation_id' => $conv->id,
                'user_id' => $conv->user_id,
                'rating' => 'bad',
                'source' => 'auto_lowconf',
                'reason' => sprintf('AI 自评 confidence=%.2f < 阈值 %.2f', (float) $aiMsg->confidence, $threshold),
            ]);
        }

        $conv->save();

        return $this->ok($this->turnView($conv, $userMsg, $aiMsg, $quotation));
    }

    // POST /api/v1/ai/feedbacks · 用户对某条 AI 消息踩/赞
    public function submitFeedback(Request $request): JsonResponse
    {
        $data = $request->validate([
            'message_id' => 'required|integer',
            'rating' => 'required|in:good,bad',
            'reason' => 'nullable|string|max:512',
        ]);

        $msg = AiMessage::with('conversation')->findOrFail($data['message_id']);
        if (! $msg->conversation || $msg->conversation->user_id !== $request->user()->id) {
            return $this->fail(1704, '无权对此消息反馈', 403);
        }
        if ($msg->sender_type !== 'ai') {
            return $this->fail(1705, '只能反馈 AI 消息', 422);
        }

        // 同一用户对同一消息覆盖式更新（不积累重复反馈）
        $fb = AiFeedback::updateOrCreate(
            [
                'message_id' => $msg->id,
                'user_id' => $request->user()->id,
                'source' => 'manual',
            ],
            [
                'conversation_id' => $msg->conversation_id,
                'rating' => $data['rating'],
                'reason' => $data['reason'] ?? null,
            ],
        );

        return $this->ok(['feedback' => $fb]);
    }

    // GET /api/v1/ai/quotations/{id}
    public function getQuotation(Request $request, int $id): JsonResponse
    {
        $q = AiQuotation::where('user_id', $request->user()->id)->findOrFail($id);
        return $this->ok(['quotation' => $q]);
    }

    // POST /api/v1/ai/quotations/{id}/add-to-cart · 一键加入购物车
    public function addQuotationToCart(Request $request, int $id): JsonResponse
    {
        $q = AiQuotation::where('user_id', $request->user()->id)->findOrFail($id);
        if ($q->status !== 'active') {
            return $this->fail(1702, '报价单已失效', 422);
        }
        if ($q->valid_until && $q->valid_until->lt(now())) {
            $q->update(['status' => 'expired']);
            return $this->fail(1703, '报价单已过期', 422);
        }

        return DB::transaction(function () use ($q, $request) {
            $user = $request->user();
            $cart = Cart::firstOrCreate([
                'user_id' => $user->id,
                'active_role' => $user->active_role ?? 'individual',
            ]);

            $added = 0;
            foreach ($q->items as $item) {
                $sku = Sku::find($item['sku_id']);
                if (! $sku || $sku->status !== 'active') continue;
                $qty = (int) $item['qty'];
                if ($qty < 1 || $qty > $sku->stock) continue;

                $existing = CartItem::where('cart_id', $cart->id)->where('sku_id', $sku->id)->first();
                if ($existing) {
                    $existing->update(['qty' => min($qty, $sku->stock), 'selected' => true]);
                } else {
                    CartItem::create([
                        'cart_id' => $cart->id,
                        'sku_id' => $sku->id,
                        'qty' => $qty,
                        'selected' => true,
                        'snapshot_price' => $item['unit_price'] ?? $sku->base_price,
                    ]);
                }
                $added++;
            }

            return $this->ok(['added' => $added, 'quotation_no' => $q->quotation_no]);
        });
    }

    private function persistAiMessage(AiConversation $conv, array $ai): AiMessage
    {
        return AiMessage::create([
            'conversation_id' => $conv->id,
            'sender_type' => 'ai',
            'content' => $ai['reply'] ?? '（无回复）',
            'confidence' => $ai['confidence'] ?? null,
            'meta' => array_filter([
                'intent' => $ai['intent'] ?? null,
                'transfer_to_human' => $ai['transfer_to_human'] ?? null,
                'sources' => $ai['sources'] ?? null,  // RAG 命中的知识来源
            ]),
        ]);
    }

    private function createQuotation(AiConversation $conv, array $quotationData): AiQuotation
    {
        return AiQuotation::create([
            'quotation_no' => 'Q'.now()->format('YmdHis').str_pad((string) random_int(0, 99), 2, '0', STR_PAD_LEFT),
            'conversation_id' => $conv->id,
            'user_id' => $conv->user_id,
            'items' => $quotationData['items'],
            'total_amount' => $quotationData['total_amount'],
            'valid_until' => now()->addDays(7),
            'status' => 'active',
            'remark' => $quotationData['remark'] ?? null,
        ]);
    }

    private function turnView(AiConversation $conv, AiMessage $userMsg, AiMessage $aiMsg, ?AiQuotation $quotation = null): array
    {
        return [
            'conversation' => $conv->fresh(),
            'user_message' => $userMsg,
            'ai_message' => $aiMsg,
            'quotation' => $quotation,
        ];
    }

    private function fallbackReply(string $text): array
    {
        return [
            'reply' => $text,
            'intent' => 'other',
            'confidence' => 0,
            'transfer_to_human' => true,
        ];
    }

    private function aiUrl(string $path): string
    {
        $base = rtrim(config('services.ai.url', env('AI_SERVICE_URL', 'http://127.0.0.1:8001')), '/');
        return $base.'/ai/v1'.$path;
    }

    private function ok(array $data): JsonResponse
    {
        return response()->json(['code' => 0, 'message' => 'ok', 'data' => $data]);
    }

    private function fail(int $code, string $message, int $status = 400): JsonResponse
    {
        return response()->json(['code' => $code, 'message' => $message, 'data' => null], $status);
    }
}
