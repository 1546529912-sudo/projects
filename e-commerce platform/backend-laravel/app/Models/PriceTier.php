<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PriceTier extends Model
{
    use HasFactory;

    protected $fillable = ['sku_id', 'min_qty', 'max_qty', 'unit_price', 'sort_order'];

    protected $casts = [
        'unit_price' => 'decimal:2',
    ];

    public function sku()
    {
        return $this->belongsTo(Sku::class);
    }
}
