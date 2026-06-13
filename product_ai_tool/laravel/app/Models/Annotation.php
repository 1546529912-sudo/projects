<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Annotation extends Model
{
    protected $fillable = [
        'demo_id',
        'demo_version_id',
        'page_key',
        'state_key',
        'x_percent',
        'y_percent',
        'iframe_scroll_x',
        'iframe_scroll_y',
        'title',
        'description',
        'type',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'x_percent' => 'float',
            'y_percent' => 'float',
            'iframe_scroll_x' => 'float',
            'iframe_scroll_y' => 'float',
        ];
    }

    public function demo(): BelongsTo
    {
        return $this->belongsTo(Demo::class);
    }

    public function demoVersion(): BelongsTo
    {
        return $this->belongsTo(DemoVersion::class);
    }
}
