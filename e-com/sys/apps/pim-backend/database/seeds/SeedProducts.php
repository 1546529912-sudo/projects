<?php
use think\migration\Seeder;

class SeedProducts extends Seeder
{
    public function run(): void
    {
        // 类目（食品 / 数码 / 服饰）
        $this->table('categories')->insert([
            ['code' => 'C-FOOD', 'name' => '食品', 'parent_id' => 0, 'level' => 1, 'sort' => 1, 'status' => 'enabled'],
            ['code' => 'C-DIGITAL', 'name' => '数码', 'parent_id' => 0, 'level' => 1, 'sort' => 2, 'status' => 'enabled'],
            ['code' => 'C-CLOTHING', 'name' => '服饰', 'parent_id' => 0, 'level' => 1, 'sort' => 3, 'status' => 'enabled'],
        ])->save();

        // 品牌
        $this->table('brands')->insert([
            ['code' => 'B-APPLE', 'name' => '苹果', 'sort' => 1, 'status' => 'enabled'],
            ['code' => 'B-HUAWEI', 'name' => '华为', 'sort' => 2, 'status' => 'enabled'],
            ['code' => 'B-DEMO', 'name' => '通用品牌', 'sort' => 99, 'status' => 'enabled'],
        ])->save();

        // SPU
        $this->table('spus')->insert([
            [
                'code' => 'SPU001',
                'name' => 'iPhone 15 Pro',
                'category_id' => 2,
                'brand_id' => 1,
                'selling_points' => json_encode(['全新原装', '全国联保'], JSON_UNESCAPED_UNICODE),
                'main_images' => json_encode(['/uploads/demo/iphone15.jpg'], JSON_UNESCAPED_UNICODE),
                'detail_html' => '<p>iPhone 15 Pro 是苹果旗舰手机...</p>',
                'base_price' => 999900,
                'status' => 'published',
                'published_at' => date('Y-m-d H:i:s'),
            ],
            [
                'code' => 'SPU002',
                'name' => 'HUAWEI Mate 60 Pro',
                'category_id' => 2,
                'brand_id' => 2,
                'selling_points' => json_encode(['麒麟芯片', '卫星通信'], JSON_UNESCAPED_UNICODE),
                'main_images' => json_encode(['/uploads/demo/mate60.jpg'], JSON_UNESCAPED_UNICODE),
                'detail_html' => '<p>HUAWEI Mate 60 Pro 旗舰手机...</p>',
                'base_price' => 699900,
                'status' => 'published',
                'published_at' => date('Y-m-d H:i:s'),
            ],
            [
                'code' => 'SPU003',
                'name' => '示例 T 恤',
                'category_id' => 3,
                'brand_id' => 3,
                'selling_points' => json_encode(['100% 纯棉', '柔软透气'], JSON_UNESCAPED_UNICODE),
                'main_images' => json_encode(['/uploads/demo/tshirt.jpg'], JSON_UNESCAPED_UNICODE),
                'detail_html' => '<p>经典款 T 恤...</p>',
                'base_price' => 9900,
                'status' => 'published',
                'published_at' => date('Y-m-d H:i:s'),
            ],
        ])->save();

        // SKU
        $this->table('skus')->insert([
            ['sku_code' => 'SPU001-001', 'spu_id' => 1, 'sales_attrs' => json_encode(['color' => '黑色', 'capacity' => '256G'], JSON_UNESCAPED_UNICODE), 'price' => 999900, 'status' => 'enabled', 'weight' => 0.187],
            ['sku_code' => 'SPU001-002', 'spu_id' => 1, 'sales_attrs' => json_encode(['color' => '白色', 'capacity' => '256G'], JSON_UNESCAPED_UNICODE), 'price' => 999900, 'status' => 'enabled', 'weight' => 0.187],
            ['sku_code' => 'SPU002-001', 'spu_id' => 2, 'sales_attrs' => json_encode(['color' => '雅川青', 'capacity' => '256G'], JSON_UNESCAPED_UNICODE), 'price' => 699900, 'status' => 'enabled', 'weight' => 0.225],
            ['sku_code' => 'SPU003-001', 'spu_id' => 3, 'sales_attrs' => json_encode(['color' => '白', 'size' => 'M'], JSON_UNESCAPED_UNICODE), 'price' => 9900, 'status' => 'enabled', 'weight' => 0.250],
            ['sku_code' => 'SPU003-002', 'spu_id' => 3, 'sales_attrs' => json_encode(['color' => '黑', 'size' => 'L'], JSON_UNESCAPED_UNICODE), 'price' => 9900, 'status' => 'enabled', 'weight' => 0.250],
        ])->save();

        echo "[seed] 3 categories, 3 brands, 3 SPUs, 5 SKUs 已写入 pim_db\n";
    }
}
