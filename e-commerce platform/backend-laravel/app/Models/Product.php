<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Product extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'category_id', 'name', 'model', 'keywords',
        'main_image_url', 'detail_images', 'description',
        'spec_pdf_url', 'status', 'view_count',
    ];

    protected $casts = [
        'detail_images' => 'array',
    ];

    public function category()
    {
        return $this->belongsTo(Category::class);
    }

    public function skus()
    {
        return $this->hasMany(Sku::class);
    }

    public function defaultSku()
    {
        return $this->hasOne(Sku::class)->orderBy('id');
    }
}
