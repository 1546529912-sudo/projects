<?php
use think\migration\Migrator;

/**
 * 商品券 / 品类券（iter-27 Q19-01）
 *   coupons 加 scope_type + scope_value
 *     scope_type: all / spu / category
 *     scope_value: JSON 数组 of ids（spu_id 或 category_id），all 模式为 NULL
 */
class AddScopeToCoupons extends Migrator
{
    public function change(): void
    {
        $this->table('coupons')
            ->addColumn('scope_type', 'string', ['limit' => 16, 'default' => 'all', 'after' => 'type'])
            ->addColumn('scope_value', 'json', ['null' => true, 'after' => 'scope_type'])
            ->update();
    }
}
