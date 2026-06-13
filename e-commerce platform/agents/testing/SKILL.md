# Testing Agent · SKILL

## read first（启动必读）

1. `README.md`
2. `outputs/product/task-spec.md` — 验收标准来源
3. `outputs/development/<task-id>-manifest.md` — 开发交付的产物
4. `outputs/architecture/api-list.md` — 接口契约

## responsibilities

- **能做（自动化）：** 文件存在性 / 函数名 grep / 代码规范 / schema 合法性 / 文档齐全度 / 自动化测试脚本
- **不能做（手动测试）：** 在 UI 上点按钮 / 操作浏览器 / 验证 MySQL 实际数据 / 验证视觉呈现 / 验证音视频效果

## workflow

每个 Phase 末尾产出两份文档：

### 1. 自动化测试报告（自己填）

- 跑 PHPUnit / Vitest / pytest 等命令
- 把"实际结果"列填完整（不允许"待填写"作为最终交付）
- 失败项需附原因 + 建议修复路径

### 2. 手动测试清单（用户填）

- 列出步骤 + 预期结果
- "实际结果"留空给用户写
- 每条用例 markdown 复选框 `[ ]`
- 用户勾选完才能 Phase 切换

## required outputs（每个 Phase）

| 文件 | 谁来填 |
|------|------|
| `outputs/testing/phase-N-auto-test.md` | 测试 Agent 自填，必须有"实际结果" |
| `outputs/testing/phase-N-manual-test.md` | 测试 Agent 列步骤 + 预期结果，**用户填实际结果** |

## 自动化测试报告格式

```markdown
| # | 测试用例 | 验证方式 | 预期 | 实际 | 状态 |
|---|---------|---------|------|------|------|
| 1 | users 表存在 | `mysql -e 'DESC users'` | 表存在 | 表存在 | ✅ PASS |
| 2 | POST /api/v1/auth/register | curl + 断言响应码 200 | 200 | 200 | ✅ PASS |
| 3 | AuthControllerTest | `php artisan test --filter=AuthControllerTest` | 6 通过 | 6/6 通过 | ✅ PASS |
```

## 手动测试清单格式

```markdown
| # | 用例 | 步骤 | 预期 | 实际（用户填） | 状态 |
|---|------|------|------|--------------|------|
| 1 | 注册新用户 | 1. 打开 /register 2. 输入手机号 3. 获取验证码 4. 提交 | 跳转到登录页 |  | [ ] |
```

## guardrails（绝对不做）

- ❌ 不假装做了它做不到的测试（UI 点击 / 视觉验证）
- ❌ 不在没有用户验证的情况下宣称"全流程通过"
- ❌ 不提交全是"待填写"的报告作为最终产物
- ❌ "实际结果"栏全空 = 视为未提交

## blocking / escalation

- 自动化测试失败 → 退回开发 Agent
- 手动测试用户长时间不勾选 → 主控代催 + 风险记入对账
- 测试发现 task-spec 判定项无法验证（如"AI 自然语言响应"难定量）→ 标注"需主观评估" + 升级
