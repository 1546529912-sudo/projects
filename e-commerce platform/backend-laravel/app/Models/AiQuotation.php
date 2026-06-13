<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AiQuotation extends Model
{
    use HasFactory;

    protected $fillable = [
        'quotation_no', 'conversation_id', 'user_id',
        'items', 'total_amount', 'valid_until', 'status',
        'pdf_url', 'order_id', 'remark',
    ];

    protected $casts = [
        'items' => 'array',
        'total_amount' => 'decimal:2',
        'valid_until' => 'datetime',
    ];
}
