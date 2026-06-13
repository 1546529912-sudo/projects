<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AiFeedback extends Model
{
    // Laravel 默认把 AiFeedback 复数化成 ai_feedback（feedback 不可数）
    protected $table = 'ai_feedbacks';

    // iter-26 乐观锁：updated_at 用微秒精度，防止同秒双写撞死锁
    protected $dateFormat = 'Y-m-d H:i:s.u';

    protected $fillable = [
        'message_id', 'conversation_id', 'user_id',
        'rating', 'source', 'reason', 'correct_answer', 'tags',
        'labeled', 'labeled_at', 'labeled_by',
    ];

    protected $casts = [
        'tags' => 'array',
        'labeled' => 'boolean',
        'labeled_at' => 'datetime',
    ];

    public function message(): BelongsTo
    {
        return $this->belongsTo(AiMessage::class, 'message_id');
    }

    public function conversation(): BelongsTo
    {
        return $this->belongsTo(AiConversation::class, 'conversation_id');
    }
}
