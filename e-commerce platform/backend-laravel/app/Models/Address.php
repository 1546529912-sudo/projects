<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Address extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'user_id', 'receiver_name', 'receiver_phone',
        'province', 'city', 'district', 'detail', 'is_default',
    ];

    protected $casts = [
        'is_default' => 'boolean',
    ];
}
