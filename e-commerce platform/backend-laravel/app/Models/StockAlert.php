<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StockAlert extends Model
{
    protected $fillable = [
        'sku_id', 'current_stock', 'threshold',
        'status', 'webhook_status', 'webhook_response', 'webhook_attempts',
        'triggered_at', 'resolved_at',
    ];

    protected $casts = [
        'triggered_at' => 'datetime',
        'resolved_at' => 'datetime',
    ];

    public function sku(): BelongsTo
    {
        return $this->belongsTo(Sku::class);
    }
}
