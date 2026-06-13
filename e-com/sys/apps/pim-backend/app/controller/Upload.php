<?php
declare(strict_types=1);

namespace app\controller;

use app\service\AuditService;
use think\Request;
use think\Response;
use think\facade\Db;

/**
 * 图片上传 - 本地存储
 * 用 PHP 原生 $_FILES 绕开 TP file() 在某些容器/PHP 8.2 环境下的 tmp 文件读取问题
 */
class Upload
{
    private const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
    private const ALLOWED_EXT = ['jpg', 'jpeg', 'png', 'gif', 'webp'];

    public function image(Request $request): Response
    {
        // 直接读 $_FILES，不走 TP Request::file()
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

        $dateDir = date('ymd');
        $relativeDir = "uploads/{$dateDir}";
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

        $url = '/' . $relativeDir . '/' . $name;
        $mime = (string)($f['type'] ?? '');

        // iter-30 C: 落盘成功后回纳图片库（失败不阻塞上传）
        try {
            $req = \think\facade\Request::instance();
            $uploader = (string)($req->admin['username'] ?? $req->admin['sub'] ?? 'admin');
            Db::name('image_library')->insert([
                'url' => $url,
                'original_name' => $origName ?: null,
                'size_bytes' => $size,
                'mime' => $mime ?: null,
                'uploader' => $uploader,
                'tags' => null,
            ]);
        } catch (\Throwable $e) {
            error_log('[Upload] image_library 回纳失败 url=' . $url . ' err=' . $e->getMessage());
        }

        return json([
            'code' => 0, 'msg' => 'ok',
            'data' => [
                'url' => $url,
                'size' => $size,
                'mime' => $mime,
            ],
        ]);
    }

    private function err(int $code, string $msg): Response
    {
        return json(['code' => $code, 'msg' => $msg, 'data' => null]);
    }
}
