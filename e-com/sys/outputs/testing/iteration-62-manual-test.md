# iteration-62-manual-test.md · 2 项 UI

1. 微信开发者工具 → pages/merchant-apply/index → 填写 5 项必填 → 提交 → 显示"✅ 申请已提交"
2. 重复提交：同手机 24h 内再提交 → 提示"该手机号 24 小时内已申请"
3. super_admin 后台 → 店铺管理 → 看到新 pending 店铺 → approve → 自动建 shop-xxx 账号
4. 跑现有退款流程（用户申请退款 / 运营批 / WMS 收回 / 退款），验证 RefundService 重构后行为一致
