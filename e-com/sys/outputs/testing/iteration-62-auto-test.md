# iteration-62-auto-test.md · 商家入驻 + Refund Model（2 项）

## 范围
- Q39-01 商家自助入驻：新公开 endpoint `/api/v1/merchant/apply`（不鉴权）+ 24h 同手机限 1 单 + code 格式校验（小写字母开头）+ 手机号格式校验 + 小程序 pages/merchant-apply 三件套（json/js/wxml/wxss）
- Q28-05 Refund Model 全替换：RefundService 内 12 处 `Db::name('refund_orders')` 全部替换为 `\app\model\Refund::query()`，沿用 think-orm 同源 query builder（行为一致，命名空间正确）

## 文件
- 1 编辑 PHP（OMS Store controller 加 publicApply）
- 1 编辑 PHP（OMS route 加 merchant/apply）
- 1 编辑 JS（shop-miniprogram apis +1 merchantApply）
- 1 编辑 JSON（shop-miniprogram app.json pages +merchant-apply）
- 1 新 JS+JSON+WXML+WXSS（shop-miniprogram pages/merchant-apply 4 文件）
- 1 编辑 PHP（OMS RefundService 12 处 Db::name → Refund::query）

## 0 新表（复用 stores 表 status='pending' 流程；后续 super 进 /admin/store/<id>/approve 自动建 store_owner 账号）

## 收口
**Q39-01 / Q28-05** ✅
