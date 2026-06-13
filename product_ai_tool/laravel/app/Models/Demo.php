<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Demo extends Model
{
    protected $fillable = [
        'title',
        'prompt',
        'model',
        'requirement_scope_json',
        'current_version_id',
    ];

    protected $casts = [
        'requirement_scope_json' => 'array',
    ];

    public function versions(): HasMany
    {
        return $this->hasMany(DemoVersion::class);
    }

    public function currentVersion(): BelongsTo
    {
        return $this->belongsTo(DemoVersion::class, 'current_version_id');
    }

    public function annotations(): HasMany
    {
        return $this->hasMany(Annotation::class);
    }
}
