<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SkuSpec extends Model
{
    use HasFactory;

    protected $fillable = ['sku_id', 'spec_key', 'spec_value', 'spec_unit'];

    public function sku()
    {
        return $this->belongsTo(Sku::class);
    }
}
