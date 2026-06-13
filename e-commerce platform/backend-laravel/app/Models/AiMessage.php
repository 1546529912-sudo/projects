<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AiMessage extends Model
{
    use HasFactory;

    protected $fillable = [
        'conversation_id', 'sender_type', 'content', 'confidence', 'meta',
    ];

    protected $casts = [
        'meta' => 'array',
        'confidence' => 'decimal:2',
    ];

    public function conversation()
    {
        return $this->belongsTo(AiConversation::class, 'conversation_id');
    }
}
