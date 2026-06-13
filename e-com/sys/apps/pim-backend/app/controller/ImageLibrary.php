<?php
declare(strict_types=1);

namespace app\controller;

use app\service\AuditService;
use think\Request;
use think\Response;
use think\facade\Db;

/**
 * 图片库（iter-30 C）
 *   - GET    /admin/image-library/list?page=&size=&keyword=&uploader=
 *   - DELETE /admin/image-library/<id>   软删（保留 URL 不真删盘上文件）
 *
 * v1 仅做"上传记录 + 列表选择"，used_count 未来由 SPU 引用计数填
 */
class ImageLibrary
{
    public function list(Request $request): Response
    {
        $page = max(1, (int)$request->param('page', 1));
        $size = max(1, min(100, (int)$request->param('size', 24)));
        $kw = trim((string)$request->param('keyword', ''));
        $uploader = trim((string)$request->param('uploader', ''));

        $q = Db::name('image_library')->whereNull('deleted_at');
        if ($kw) $q->whereLike('original_name', "%{$kw}%");
        if ($uploader) $q->where('uploader', $uploader);

        $total = (clone $q)->count();
        $rows = $q->order('id', 'desc')->page($page, $size)->select()->toArray();

        // iter-31 Q30-03: 实时算 used_count（SPU.main_images JSON 中含此 url 的计数）
        $usedMap = [];
        if ($rows) {
            $urls = array_column($rows, 'url');
            $spus = Db::name('spus')->whereNull('deleted_at')
                ->field('id, main_images')->select()->toArray();
            foreach ($spus as $s) {
                $imgs = is_string($s['main_images']) ? (json_decode($s['main_images'], true) ?: []) : ($s['main_images'] ?: []);
                foreach ($imgs as $u) {
                    if (in_array($u, $urls, true)) $usedMap[$u] = ($usedMap[$u] ?? 0) + 1;
                }
            }
        }

        foreach ($rows as &$r) {
            $r['tags'] = $r['tags'] ? (json_decode($r['tags'], true) ?: []) : [];
            $r['size_kb'] = $r['size_bytes'] > 0 ? round($r['size_bytes'] / 1024, 1) : 0;
            $r['used_count'] = $usedMap[$r['url']] ?? 0;
        }

        return $this->ok(['list' => $rows, 'total' => $total, 'page' => $page, 'size' => $size]);
    }

    public function delete(int $id): Response
    {
        $row = Db::name('image_library')->where('id', $id)->whereNull('deleted_at')->find();
        if (!$row) return $this->err(404, '图片不存在');

        // iter-31 Q30-03: 删除前检查 SPU 引用，有引用则阻断
        $usingSpus = [];
        $spus = Db::name('spus')->whereNull('deleted_at')->field('id, name, main_images')->select()->toArray();
        foreach ($spus as $s) {
            $imgs = is_string($s['main_images']) ? (json_decode($s['main_images'], true) ?: []) : ($s['main_images'] ?: []);
            if (in_array($row['url'], $imgs, true)) {
                $usingSpus[] = ['id' => (int)$s['id'], 'name' => $s['name']];
            }
        }
        if ($usingSpus) {
            $names = implode('、', array_slice(array_column($usingSpus, 'name'), 0, 3));
            $more = count($usingSpus) > 3 ? " 等 " . count($usingSpus) . " 个" : '';
            return json([
                'code' => 409,
                'msg'  => "该图被 SPU「{$names}{$more}」引用，请先在 SPU 编辑页移除引用",
                'data' => ['using_spus' => $usingSpus],
            ]);
        }

        Db::name('image_library')->where('id', $id)->update(['deleted_at' => date('Y-m-d H:i:s')]);
        AuditService::log('image_library.delete', 'image', (string)$id, $row, null);
        return $this->ok(['id' => $id]);
    }

    private function ok(mixed $data): Response { return json(['code' => 0, 'msg' => 'ok', 'data' => $data]); }
    private function err(int $code, string $msg): Response { return json(['code' => $code, 'msg' => $msg, 'data' => null]); }
}
