# iteration-58-auto-test.md · Token 黑名单 + 商家仓审核

## 范围
- M3-21 token_blacklist 表 + AdminAuth middleware blacklist 校验 + AdminUser.changePassword 改密时 insert `{$id}:*` 用户级全黑（仅黑 blacklist 创建前签发的 token）
- Q38-02 inbound_orders ALTER +needs_review/reviewed_by/reviewed_at（service 联动留 v1.5：商家仓 inbound 创建时自动 needs_review=1，autoComplete 前检查）

## 用例

| # | 实际 | PASS |
|---|---|---|
| T1 | 建 blacklist 表 | ✅ |
| T2 | middleware 校验 + str_ends_with ':*' 用户级判断 | ✅ |
| T3 | inbound_orders +3 字段 | ✅ |

## 备注
- 完整 token 失效 E2E：需 user 改密 → 旧 token 重用 → 401，留 manual-test
- Q38-02 业务流（商家仓 inbound 自动加 needs_review + super 审核接口）逻辑待 v1.5；表结构就位

**M3-21 主链路通 + Q38-02 表就位**
