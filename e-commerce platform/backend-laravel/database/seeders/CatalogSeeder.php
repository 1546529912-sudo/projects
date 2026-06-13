<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\PriceTier;
use App\Models\Product;
use App\Models\Sku;
use App\Models\SkuSpec;
use Illuminate\Database\Seeder;

class CatalogSeeder extends Seeder
{
    public function run(): void
    {
        // 1. 分类
        $categories = [
            ['name' => '碳纤维板', 'slug' => 'carbon-plate'],
            ['name' => '碳纤维管', 'slug' => 'carbon-tube'],
            ['name' => '碳纤维布', 'slug' => 'carbon-cloth'],
            ['name' => '玻璃纤维', 'slug' => 'glass-fiber'],
            ['name' => '芳纶', 'slug' => 'aramid'],
            ['name' => '预浸料', 'slug' => 'prepreg'],
        ];
        foreach ($categories as $i => $row) {
            Category::firstOrCreate(['slug' => $row['slug']], array_merge($row, [
                'sort_order' => $i, 'status' => 'active', 'icon_url' => null,
            ]));
        }

        $catId = fn (string $slug) => Category::where('slug', $slug)->first()->id;

        // 2. 商品 + SKU（含规格 + 阶梯价）
        $products = [
            [
                'product' => [
                    'name' => 'T700 标准型碳纤维板',
                    'model' => 'CF-T700',
                    'category_id' => $catId('carbon-plate'),
                    'keywords' => 'T700,碳纤维板,航空级',
                    'main_image_url' => 'https://picsum.photos/seed/cf-t700-3mm/600/600',
                    'description' => 'T700 碳纤维板，单向铺层，密度 1.78 g/cm³，抗伸强度 4900 MPa。可选 3MM/5MM 两种厚度。',
                ],
                'skus' => [
                    [
                        'code' => 'CF-T700-3MM',
                        'base_price' => 1380.00,
                        'stock' => 2000,
                        'specs' => [
                            ['thickness', '3', 'mm'],
                            ['density', '1.78', 'g/cm³'],
                        ],
                        'tiers' => [
                            [1, 99, 1380.00],
                            [100, 499, 1280.00],
                            [500, 999, 1180.00],
                            [1000, null, 1080.00],
                        ],
                    ],
                    [
                        'code' => 'CF-T700-5MM',
                        'base_price' => 1980.00,
                        'stock' => 1500,
                        'specs' => [
                            ['thickness', '5', 'mm'],
                            ['density', '1.78', 'g/cm³'],
                        ],
                        'tiers' => [
                            [1, 99, 1980.00],
                            [100, 499, 1880.00],
                            [500, null, 1780.00],
                        ],
                    ],
                ],
            ],
            [
                'product' => [
                    'name' => 'T800 高强型碳纤维管',
                    'model' => 'CF-T800-TUBE',
                    'category_id' => $catId('carbon-tube'),
                    'keywords' => 'T800,碳纤维管,OD20',
                    'main_image_url' => 'https://picsum.photos/seed/cf-tube-od20/600/600',
                    'description' => 'T800 高强型，外径 20mm，壁厚 2mm，抗压性能优异。',
                ],
                'skus' => [
                    [
                        'code' => 'CF-T800-OD20',
                        'base_price' => 320.00,
                        'stock' => 5000,
                        'specs' => [
                            ['outer_diameter', '20', 'mm'],
                            ['wall_thickness', '2', 'mm'],
                            ['tensile_strength', '5490', 'MPa'],
                        ],
                        'tiers' => [
                            [1, 49, 320.00],
                            [50, 199, 295.00],
                            [200, null, 270.00],
                        ],
                    ],
                ],
            ],
            [
                'product' => [
                    'name' => '3K 平纹碳纤维布',
                    'model' => 'CF-3K-CLOTH',
                    'category_id' => $catId('carbon-cloth'),
                    'keywords' => '3K,平纹,碳纤维布',
                    'main_image_url' => 'https://picsum.photos/seed/carbon-cloth-3k/600/600',
                    'description' => '3K 平纹编织碳纤维布，用于复合材料铺层。可选 200g / 240g 两种克重。',
                ],
                'skus' => [
                    [
                        'code' => 'CF-3K-200G',
                        'base_price' => 95.00,
                        'stock' => 5000,
                        'specs' => [['areal_weight', '200', 'g/m²']],
                        'tiers' => [
                            [1, 99, 95.00],
                            [100, 999, 88.00],
                            [1000, null, 80.00],
                        ],
                    ],
                    [
                        'code' => 'CF-3K-240G',
                        'base_price' => 115.00,
                        'stock' => 3000,
                        'specs' => [['areal_weight', '240', 'g/m²']],
                        'tiers' => [
                            [1, 99, 115.00],
                            [100, null, 108.00],
                        ],
                    ],
                ],
            ],
            [
                'product' => [
                    'name' => 'E 玻璃纤维布 200G',
                    'model' => 'GF-E-200G',
                    'category_id' => $catId('glass-fiber'),
                    'keywords' => 'E玻璃,200g,平纹',
                    'main_image_url' => 'https://picsum.photos/seed/glass-fiber-e200/600/600',
                    'description' => 'E 级玻璃纤维布，200g/m²，电绝缘性能优良。',
                ],
                'skus' => [
                    [
                        'code' => 'GF-E-200G',
                        'base_price' => 32.00,
                        'stock' => 8000,
                        'specs' => [['areal_weight', '200', 'g/m²'], ['grade', 'E', null]],
                        'tiers' => [
                            [1, 199, 32.00],
                            [200, 1999, 28.00],
                            [2000, null, 25.00],
                        ],
                    ],
                ],
            ],
            [
                'product' => [
                    'name' => '芳纶 1414 平纹布 200G',
                    'model' => 'AR-1414-200G',
                    'category_id' => $catId('aramid'),
                    'keywords' => '芳纶,1414,200g,防弹',
                    'main_image_url' => 'https://picsum.photos/seed/aramid-1414/600/600',
                    'description' => '芳纶 1414 平纹布，200g/m²，优异的抗冲击与耐切割性。',
                ],
                'skus' => [
                    [
                        'code' => 'AR-1414-200G',
                        'base_price' => 280.00,
                        'stock' => 600,
                        'specs' => [['areal_weight', '200', 'g/m²'], ['grade', '1414', null]],
                        'tiers' => [
                            [1, 49, 280.00],
                            [50, 499, 260.00],
                            [500, null, 240.00],
                        ],
                    ],
                ],
            ],
        ];

        // 3. 清空旧数据后重建（避免与 iter-3 单 SKU 冲突）
        SkuSpec::query()->delete();
        PriceTier::query()->delete();
        Sku::query()->delete();
        Product::query()->forceDelete();

        foreach ($products as $row) {
            $p = Product::create(array_merge($row['product'], ['status' => 'active']));
            foreach ($row['skus'] as $skuRow) {
                $sku = Sku::create([
                    'product_id' => $p->id,
                    'sku_code' => $skuRow['code'],
                    'base_price' => $skuRow['base_price'],
                    'stock' => $skuRow['stock'],
                    'stock_threshold' => 10,
                    'status' => 'active',
                ]);
                foreach ($skuRow['specs'] ?? [] as [$key, $value, $unit]) {
                    SkuSpec::create([
                        'sku_id' => $sku->id,
                        'spec_key' => $key,
                        'spec_value' => $value,
                        'spec_unit' => $unit,
                    ]);
                }
                foreach ($skuRow['tiers'] ?? [] as $i => [$min, $max, $price]) {
                    PriceTier::create([
                        'sku_id' => $sku->id,
                        'min_qty' => $min,
                        'max_qty' => $max,
                        'unit_price' => $price,
                        'sort_order' => $i,
                    ]);
                }
            }
        }
    }
}
