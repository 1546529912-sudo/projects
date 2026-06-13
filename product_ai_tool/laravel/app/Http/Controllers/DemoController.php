<?php

namespace App\Http\Controllers;

use App\Models\Demo;
use Illuminate\Http\Response;

class DemoController extends Controller
{
    public function preview(Demo $demo): Response
    {
        $demo->loadMissing('currentVersion');
        $html = $demo->currentVersion?->html_code;

        if ($html === null || $html === '') {
            abort(404, 'No current version');
        }

        return response($html, 200)
            ->header('Content-Type', 'text/html; charset=UTF-8');
    }
}
