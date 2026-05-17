<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AILog extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'task_type',
        'model_name',
        'prompt_content',
        'input_content',
        'output_content',
        'is_success',
        'retry_count',
        'duration_ms',
        'token_usage',
    ];

    protected $casts = [
        'is_success' => 'boolean',
    ];
}
