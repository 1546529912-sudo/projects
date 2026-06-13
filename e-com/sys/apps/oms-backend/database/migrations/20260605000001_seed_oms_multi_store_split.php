<?php
declare(strict_types=1);

use think\migration\Migrator;

/**
 * iter-61 Q37-02：把多店拆单灰度开关从 env 改 KV（在线可调）
 */
class SeedOmsMultiStoreSplit extends Migrator
{
    public function change(): void
    {
        $existing = $this->fetchRow("SELECT id FROM system_configs WHERE config_key='oms.multi_store_split'");
        if (!$existing) {
            $this->execute("INSERT INTO system_configs (config_key, config_value, category, description) VALUES ('oms.multi_store_split','0','order','多店购物车自动拆单灰度开关（0=拒绝多店 / 1=按比例分摊券+拆单）')");
        }
        $existing2 = $this->fetchRow("SELECT id FROM system_configs WHERE config_key='wms.transfer_cross_store_review'");
        if (!$existing2) {
            $this->execute("INSERT INTO system_configs (config_key, config_value, category, description) VALUES ('wms.transfer_cross_store_review','1','warehouse','跨店调拨需平台代理审核（0=直放行 / 1=待 super 审核）')");
        }
    }
}
