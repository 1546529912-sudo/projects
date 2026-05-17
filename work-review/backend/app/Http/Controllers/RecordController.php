<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use App\Services\ASRService;
use App\Models\WorkRecord;

class RecordController extends Controller
{
    public function __construct(private ASRService $asrService) {}

    public function upload(Request $request): JsonResponse
    {
        $request->validate([
            'audio' => 'required|file|mimes:mp3,wav,m4a,webm|max:' . (config('ai.max_audio_size_mb', 10) * 1024),
        ]);

        $path = $request->file('audio')->store('recordings', 'local');

        $record = WorkRecord::create([
            'user_id' => $request->user()->id,
            'audio_path' => $path,
            'status' => 'uploaded',
        ]);

        return response()->json([
            'code' => 0,
            'message' => 'success',
            'data' => [
                'record_id' => $record->id,
                'audio_path' => $path,
            ],
        ]);
    }

    public function asr(Request $request): JsonResponse
    {
        $request->validate([
            'record_id' => 'required|integer|exists:work_records,id',
        ]);

        $record = WorkRecord::findOrFail($request->record_id);

        // TODO: 鉴权检查 record 属于当前用户

        try {
            $text = $this->asrService->transcribe($record->audio_path);

            $record->update([
                'raw_text' => $text,
                'status' => 'transcribed',
            ]);

            return response()->json([
                'code' => 0,
                'message' => 'success',
                'data' => [
                    'record_id' => $record->id,
                    'text' => $text,
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'code' => 5031,
                'message' => 'ASR 服务异常：' . $e->getMessage(),
                'data' => null,
            ], 500);
        }
    }
}
