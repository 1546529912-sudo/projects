<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AiConversation extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id', 'session_id', 'source', 'intent',
        'context_json', 'transferred', 'transferred_at', 'is_business',
    ];

    protected $casts = [
        'context_json' => 'array',
        'transferred' => 'boolean',
        'is_business' => 'boolean',
        'transferred_at' => 'datetime',
    ];

    public function messages()
    {
        return $this->hasMany(AiMessage::class, 'conversation_id');
    }
}
