<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LogisticsTrack extends Model
{
    use HasFactory;

    protected $fillable = [
        'order_id', 'node', 'location', 'description', 'occurred_at',
    ];

    protected $casts = [
        'occurred_at' => 'datetime',
    ];

    public function order()
    {
        return $this->belongsTo(Order::class);
    }
}
