<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Sku extends Model
{
    use HasFactory;

    protected $fillable = [
        'product_id', 'sku_code',
        'base_price', 'stock', 'stock_threshold', 'status',
    ];

    protected $casts = [
        'base_price' => 'decimal:2',
    ];

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function priceTiers()
    {
        return $this->hasMany(PriceTier::class)->orderBy('min_qty');
    }

    public function specs()
    {
        return $this->hasMany(SkuSpec::class);
    }

    /** 按数量解析单价：命中阶梯价 → 该档价；无阶梯 → base_price */
    public function resolvePrice(int $qty): string
    {
        $tier = $this->priceTiers()
            ->where('min_qty', '<=', $qty)
            ->where(function ($q) use ($qty) {
                $q->whereNull('max_qty')->orWhere('max_qty', '>=', $qty);
            })
            ->orderByDesc('min_qty')
            ->first();

        return number_format((float) ($tier?->unit_price ?? $this->base_price), 2, '.', '');
    }

    /** 价格范围（用于商品卡片"起价"显示）*/
    public function priceRange(): array
    {
        $tiers = $this->priceTiers;
        if ($tiers->isEmpty()) {
            return ['min' => $this->base_price, 'max' => $this->base_price];
        }
        $prices = $tiers->pluck('unit_price')->push($this->base_price)->map(fn ($p) => (float) $p);
        return [
            'min' => number_format($prices->min(), 2, '.', ''),
            'max' => number_format($prices->max(), 2, '.', ''),
        ];
    }
}
