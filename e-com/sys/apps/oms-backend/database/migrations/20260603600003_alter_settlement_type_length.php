<?php
use think\migration\Migrator;

/**
 * settlement_orders.type 扩到 32 字符（iter-37 BIZ-08-3 fix-1）
 *   iter-26 原 16 字符 → platform_commission 19 字符放不下
 */
class AlterSettlementTypeLength extends Migrator
{
    public function change(): void
    {
        $this->table('settlement_orders')
            ->changeColumn('type', 'string', ['limit' => 32, 'null' => false])
            ->update();
    }
}
