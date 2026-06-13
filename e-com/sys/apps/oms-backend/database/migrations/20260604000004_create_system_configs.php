<?php
use think\migration\Migrator;

/**
 * 系统配置 KV（iter-52 · Q43-01/Q48-03/Q49-01/Q50-02 阈值后台可配）
 *
 * 沿用 iter-32 wms_configs KV 模式，跨多 category：
 *   - refund_threshold: 二审金额（元）
 *   - exchange_threshold: 换货数量阈值
 *   - sku_lifecycle: 新品天数 / 热销下限 / 滞销上限 / 淘汰天数
 *   - alert: 预警 ratio + count 阈值
 *   - withdrawal: 提现金额上下限
 */
class CreateSystemConfigs extends Migrator
{
    public function change(): void
    {
        $t = $this->table('system_configs', [
            'engine' => 'InnoDB', 'collation' => 'utf8mb4_unicode_ci',
            'comment' => '系统配置 KV',
        ])
            ->addColumn('config_key', 'string', ['limit' => 100])
            ->addColumn('config_value', 'string', ['limit' => 500])
            ->addColumn('category', 'string', ['limit' => 50])
            ->addColumn('description', 'string', ['limit' => 255, 'null' => true])
            ->addColumn('updated_by', 'string', ['limit' => 64, 'null' => true])
            ->addColumn('updated_at', 'datetime', ['default' => 'CURRENT_TIMESTAMP', 'update' => 'CURRENT_TIMESTAMP'])
            ->addIndex(['config_key'], ['unique' => true, 'name' => 'uk_key'])
            ->addIndex(['category'], ['name' => 'idx_category'])
            ->create();

        // 默认配置种子
        $seed = [
            ['refund_threshold.amount_yuan',     '500',  'refund_threshold',  '退款 sales 一审金额上限（元）超过需 super 二审'],
            ['exchange_threshold.qty',           '3',    'exchange_threshold','换货数量 sales 一审上限 超过需 super 二审'],
            ['sku_lifecycle.new_days',           '30',   'sku_lifecycle',     '新品阶段判定：上架 ≤N 天'],
            ['sku_lifecycle.hot_sales_min',      '10',   'sku_lifecycle',     '热销阶段判定：窗口销量 ≥N'],
            ['sku_lifecycle.stale_sales_max',    '5',    'sku_lifecycle',     '滞销阶段判定：窗口销量 <N 且在库 >0'],
            ['sku_lifecycle.eol_days',           '90',   'sku_lifecycle',     '淘汰阶段判定：销0库0且上架 >N 天'],
            ['alert.order_surge_critical',       '2.0',  'alert',             '订单激增 critical ratio 阈值'],
            ['alert.order_surge_warn',           '1.5',  'alert',             '订单激增 warn ratio 阈值'],
            ['alert.order_drop_warn',            '0.3',  'alert',             '订单暴跌 warn ratio 阈值 (<=)'],
            ['alert.stock_low_critical',         '5',    'alert',             '库存掉底 critical SKU 数'],
            ['alert.stock_low_warn',             '1',    'alert',             '库存掉底 warn SKU 数'],
            ['alert.refund_spike_critical',     '1.5',   'alert',             '退款率突升 critical ratio'],
            ['alert.refund_spike_warn',         '1.2',   'alert',             '退款率突升 warn ratio'],
            ['alert.dead_letter_critical',      '10',    'alert',             '死信积压 critical 条数'],
            ['alert.dead_letter_warn',          '3',     'alert',             '死信积压 warn 条数'],
            ['withdrawal.min_amount_yuan',      '10',    'withdrawal',        '提现金额下限（元）'],
            ['withdrawal.max_amount_yuan',      '50000', 'withdrawal',        '单笔提现金额上限（元）'],
        ];
        foreach ($seed as $row) {
            $this->execute(sprintf(
                "INSERT INTO system_configs (config_key, config_value, category, description) VALUES (%s, %s, %s, %s)",
                "'" . addslashes($row[0]) . "'",
                "'" . addslashes($row[1]) . "'",
                "'" . addslashes($row[2]) . "'",
                "'" . addslashes($row[3]) . "'"
            ));
        }
    }
}
