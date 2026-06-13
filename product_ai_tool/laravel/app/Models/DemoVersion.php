<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DemoVersion extends Model
{
    protected $fillable = [
        'demo_id',
        'version_no',
        'html_code',
        'model',
        'source_type',
        'source_annotation_id',
        'prompt',
    ];

    public function demo(): BelongsTo
    {
        return $this->belongsTo(Demo::class, 'demo_id');
    }
}
