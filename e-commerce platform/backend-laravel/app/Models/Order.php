<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Order extends Model
{
    use HasFactory;

    protected $fillable = [
        'order_no', 'user_id', 'active_role',
        'product_amount', 'shipping_fee', 'discount_amount', 'total_amount', 'paid_amount',
        'status', 'shipping_method', 'shipping_address',
        'tracking_company', 'tracking_no',
        'remark', 'cancel_reason', 'cancelled_at',
        'paid_at', 'shipped_at', 'received_at', 'completed_at',
    ];

    protected $casts = [
        'shipping_address' => 'array',
        'product_amount' => 'decimal:2',
        'shipping_fee' => 'decimal:2',
        'discount_amount' => 'decimal:2',
        'total_amount' => 'decimal:2',
        'paid_amount' => 'decimal:2',
        'cancelled_at' => 'datetime',
        'paid_at' => 'datetime',
        'shipped_at' => 'datetime',
        'received_at' => 'datetime',
        'completed_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function items()
    {
        return $this->hasMany(OrderItem::class);
    }

    public function payments()
    {
        return $this->hasMany(Payment::class);
    }
}
