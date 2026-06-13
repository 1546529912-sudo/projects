<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Company;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

/**
 * 企业认证 Controller
 *
 * 对应：
 * - TRADE-001-04 提交企业认证
 * - TRADE-001-05 后台审核
 */
class CompanyController extends Controller
{
    // POST /api/v1/companies · 提交企业认证
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:128',
            'credit_code' => 'required|string|regex:/^[0-9A-HJ-NPQRTUWXY]{18}$/i',
            'license_url' => 'required|url|max:512',
            'contact_name' => 'required|string|max:64',
            'contact_phone' => 'required|regex:/^1[3-9]\d{9}$/',
        ]);

        $user = $request->user();

        if (Company::where('credit_code', $data['credit_code'])->exists()) {
            return $this->fail(1101, '该企业已被认证', 422);
        }

        if (Company::where('user_id', $user->id)->whereIn('status', ['pending', 'approved'])->exists()) {
            return $this->fail(1102, '您已提交认证，请勿重复提交', 422);
        }

        $company = Company::create([
            'user_id' => $user->id,
            'name' => $data['name'],
            'credit_code' => strtoupper($data['credit_code']),
            'license_url' => $data['license_url'],
            'contact_name' => $data['contact_name'],
            'contact_phone' => $data['contact_phone'],
            'status' => 'pending',
        ]);

        return $this->ok(['company' => $company]);
    }

    // GET /api/v1/companies/me · 当前用户企业认证状态
    public function me(Request $request): JsonResponse
    {
        $company = Company::where('user_id', $request->user()->id)
            ->latest()
            ->first();

        return $this->ok(['company' => $company]);
    }

    // POST /api/v1/upload/license · 营业执照上传（stub: 本地存储）
    public function uploadLicense(Request $request): JsonResponse
    {
        $request->validate([
            'file' => 'required|file|mimes:jpg,jpeg,png,pdf|max:10240',
        ]);

        $path = $request->file('file')->store('licenses', 'public');
        $url = url(Storage::url($path));

        return $this->ok(['url' => $url, 'path' => $path]);
    }

    // GET /api/v1/admin/companies/pending · 待审核列表
    public function adminPending(Request $request): JsonResponse
    {
        $items = Company::where('status', 'pending')
            ->latest()
            ->paginate(20);

        return $this->ok([
            'items' => $items->items(),
            'total' => $items->total(),
            'page' => $items->currentPage(),
            'per_page' => $items->perPage(),
        ]);
    }

    // POST /api/v1/admin/companies/{id}/review · 审核
    public function adminReview(Request $request, int $id): JsonResponse
    {
        $data = $request->validate([
            'action' => 'required|in:approve,reject',
            'reject_reason' => 'required_if:action,reject|string|max:512',
        ]);

        $company = Company::findOrFail($id);
        if ($company->status !== 'pending') {
            return $this->fail(1103, '该认证已审核', 422);
        }

        $company->update([
            'status' => $data['action'] === 'approve' ? 'approved' : 'rejected',
            'reject_reason' => $data['reject_reason'] ?? null,
            'reviewer_id' => $request->user()->id,
            'reviewed_at' => now(),
        ]);

        // 审核通过 → 升级用户角色为 enterprise + 关联 company_id
        if ($company->status === 'approved') {
            $company->user->update([
                'role' => 'enterprise',
                'company_id' => $company->id,
            ]);
        }

        return $this->ok(['company' => $company->fresh()]);
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
