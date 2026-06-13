# iteration-52-manual-test.md · 系统参数后台

> auto-test 10/10 ✅。

## 用例（3 项 UI）

| # | 步骤 | 期望 |
|---|---|---|
| M1 | super 登录 → 系统管理 → "⚙️ 系统参数" | 见 5 分组 17 项 |
| M2 | 改任意值（如 alert.dead_letter_warn 3→5）→ 见橙色 "已改"提示 → 点保存 | toast "已保存 1 项" |
| M3 | sales / store_owner / editor 登录 → 菜单不可见 / 直访 URL 403 | RBAC OK |
