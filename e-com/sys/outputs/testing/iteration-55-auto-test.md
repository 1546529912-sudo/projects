# iteration-55-auto-test.md · RBAC 收紧（Q44-05 + Q43-03）

## 范围
- Q44-05 OMS 主 admin group 显式角色白名单 — 排除 editor（仅 PIM）
- Q43-03 OMS StoreContextService 给 sales_ops 加按店细分（有 store_admins 绑定走限店；无绑定保留跨店兼容旧账号）

## 用例（4 项全 PASS）

| # | 实际 | PASS |
|---|---|---|
| T1 | editor → OMS admin/order/list HTTP 403 + msg 角色拒 | ✅ |
| T2 | editor → OMS quick-search 403 | ✅ |
| T3 | editor → PIM admin/spu/list code:0 total:8（仍正常）| ✅ |
| T4 | sales（无 store_admins 绑定）→ OMS order/list code:0 total:41（跨店兼容）| ✅ |

## 文件
- 1 编辑 PHP（OMS route 主 admin group middleware 加显式 5 角色白名单）
- 1 编辑 PHP（OMS StoreContextService sales_ops 分支：有 store_admins 限店 / 无绑定跨店）

**4/4 ✅ + 0 fix**
