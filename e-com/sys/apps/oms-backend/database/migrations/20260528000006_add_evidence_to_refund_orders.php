<?php
use think\migration\Migrator;

/**
 * refund_orders 加 evidence_images 列（iter-15）：
 *   存用户上传的退货凭证图片 URL 数组，最多 5 张
 *   JSON 格式：["uploads/xxx/abc.jpg", "uploads/xxx/def.png"]
 */
class AddEvidenceToRefundOrders extends Migrator
{
    public function change(): void
    {
        $this->table('refund_orders')
            ->addColumn('evidence_images', 'json', ['null' => true, 'after' => 'reason'])
            ->update();
    }
}
