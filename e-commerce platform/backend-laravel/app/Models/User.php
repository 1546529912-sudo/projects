<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, SoftDeletes;

    protected $fillable = [
        'phone', 'password', 'wechat_openid', 'wechat_unionid',
        'name', 'email', 'avatar_url',
        'role', 'active_role', 'company_id', 'status',
        'last_login_at', 'last_login_ip',
    ];

    protected $hidden = ['password', 'remember_token'];

    protected $casts = [
        'last_login_at' => 'datetime',
    ];
}
