<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Address;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AddressController extends Controller
{
    // GET /api/v1/addresses
    public function index(Request $request): JsonResponse
    {
        $items = Address::where('user_id', $request->user()->id)
            ->orderByDesc('is_default')
            ->latest()
            ->get();

        return $this->ok(['items' => $items]);
    }

    // POST /api/v1/addresses
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'receiver_name' => 'required|string|max:64',
            'receiver_phone' => 'required|regex:/^1[3-9]\d{9}$/',
            'province' => 'required|string|max:32',
            'city' => 'required|string|max:32',
            'district' => 'required|string|max:32',
            'detail' => 'required|string|max:255',
            'is_default' => 'sometimes|boolean',
        ]);

        $user = $request->user();

        // 上限 20 条
        if (Address::where('user_id', $user->id)->count() >= 20) {
            return $this->fail(1201, '地址数量已达上限（20 条）', 422);
        }

        return DB::transaction(function () use ($data, $user) {
            $isDefault = $data['is_default'] ?? false;

            // 若是第一条地址，自动设为默认
            $existing = Address::where('user_id', $user->id)->count();
            if ($existing === 0) $isDefault = true;

            if ($isDefault) {
                Address::where('user_id', $user->id)->update(['is_default' => false]);
            }

            $address = Address::create([
                'user_id' => $user->id,
                'receiver_name' => $data['receiver_name'],
                'receiver_phone' => $data['receiver_phone'],
                'province' => $data['province'],
                'city' => $data['city'],
                'district' => $data['district'],
                'detail' => $data['detail'],
                'is_default' => $isDefault,
            ]);

            return $this->ok(['address' => $address]);
        });
    }

    // PUT /api/v1/addresses/{id}
    public function update(Request $request, int $id): JsonResponse
    {
        $address = Address::where('user_id', $request->user()->id)->findOrFail($id);

        $data = $request->validate([
            'receiver_name' => 'sometimes|string|max:64',
            'receiver_phone' => 'sometimes|regex:/^1[3-9]\d{9}$/',
            'province' => 'sometimes|string|max:32',
            'city' => 'sometimes|string|max:32',
            'district' => 'sometimes|string|max:32',
            'detail' => 'sometimes|string|max:255',
            'is_default' => 'sometimes|boolean',
        ]);

        return DB::transaction(function () use ($data, $address, $request) {
            if (! empty($data['is_default'])) {
                Address::where('user_id', $request->user()->id)
                    ->where('id', '!=', $address->id)
                    ->update(['is_default' => false]);
            }
            $address->fill($data)->save();
            return $this->ok(['address' => $address->fresh()]);
        });
    }

    // DELETE /api/v1/addresses/{id}
    public function destroy(Request $request, int $id): JsonResponse
    {
        $address = Address::where('user_id', $request->user()->id)->findOrFail($id);
        $address->delete();
        return $this->ok(['id' => $id]);
    }

    private function ok(array $data): JsonResponse
    {
        return response()->json(['code' => 0, 'message' => 'ok', 'data' => $data]);
    }

    private function fail(int $code, string $message, int $status = 400): JsonResponse
    {
        return response()->json(['code' => $code, 'message' => $message, 'data' => null], $status);
    }
}
