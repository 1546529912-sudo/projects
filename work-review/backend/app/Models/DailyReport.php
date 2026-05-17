<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class DailyReport extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'user_id',
        'report_date',
        'content',
        'template',
        'personal_text',
        'formal_text',
    ];

    protected $casts = [
        'content' => 'array',
        'report_date' => 'date',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
