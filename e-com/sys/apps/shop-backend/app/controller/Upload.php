<?php
declare(strict_types=1);

namespace app\controller;

use think\Request;
use think\Response;

/**
 * 用户态图片上传 - 本地存储（iter-15 退货凭证）
 * 与 pim-backend Upload 相同的 $_FILES 模式（iter-10 fix-5）
 * 返回 url 以 /uploads/ 起始，nginx alias 已配置
 */
class Upload
{
    private const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
    private const ALLOWED_EXT = ['jpg', 'jpeg', 'png', 'gif', 'webp'];

    public function image(Request $request): Response
    {
        if (empty($_FILES['file'])) {
            return $this->err(400, '请上传 file 字段');
        }
        $f = $_FILES['file'];
        if (($f['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
            return $this->err(400, '上传错误码: ' . $f['error']);
        }
        $tmpName = (string)($f['tmp_name'] ?? '');
        if (!$tmpName || !is_uploaded_file($tmpName)) {
            return $this->err(400, "临时文件无效: {$tmpName}");
        }
        $size = (int)($f['size'] ?? 0);
        if ($size > self::MAX_BYTES) {
            return $this->err(400, '图片大小不能超过 5MB');
        }
        $origName = (string)($f['name'] ?? '');
        $ext = strtolower(pathinfo($origName, PATHINFO_EXTENSION));
        if (!in_array($ext, self::ALLOWED_EXT, true)) {
            return $this->err(400, '只支持 jpg/jpeg/png/gif/webp');
        }

        // refund-evid 子目录：与 PIM 的 uploads 内容隔离，方便 vite 用 longest-prefix 代理区分
        $dateDir = date('ymd');
        $relativeDir = "uploads/refund-evid/{$dateDir}";
        $diskDir = "/var/www/html/runtime/{$relativeDir}";
        if (!is_dir($diskDir) && !@mkdir($diskDir, 0775, true) && !is_dir($diskDir)) {
            return $this->err(500, "目录创建失败: {$diskDir}");
        }

        $name = bin2hex(random_bytes(8)) . '.' . $ext;
        $diskPath = $diskDir . '/' . $name;
        if (!@move_uploaded_file($tmpName, $diskPath)) {
            $err = error_get_last();
            return $this->err(500, '文件保存失败: ' . ($err['message'] ?? 'unknown'));
        }

        return json([
            'code' => 0, 'msg' => 'ok',
            'data' => [
                'url' => '/' . $relativeDir . '/' . $name,
                'size' => $size,
                'mime' => (string)($f['type'] ?? ''),
            ],
        ]);
    }

    private function err(int $code, string $msg): Response
    {
        return json(['code' => $code, 'msg' => $msg, 'data' => null]);
    }
}
