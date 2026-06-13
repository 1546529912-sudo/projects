<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CartItem extends Model
{
    use HasFactory;

    protected $fillable = ['cart_id', 'sku_id', 'qty', 'selected', 'snapshot_price'];

    protected $casts = [
        'selected' => 'boolean',
        'snapshot_price' => 'decimal:2',
    ];

    public function cart()
    {
        return $this->belongsTo(Cart::class);
    }

    public function sku()
    {
        return $this->belongsTo(Sku::class);
    }
}
