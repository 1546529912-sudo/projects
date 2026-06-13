# HARNESS · 防错机制

## 【当前焦点】

- 当前必须验证：Phase -1 五份产品产物的"判定项数量 ≥ 子功能数 × 5"
- 当前对账报告：`outputs/orchestration/reconcile-report-iteration-1.md`（待生成）

## 【必须遵守】

### 状态变更证据要求

任一任务从"进行中"→"完成"必须同时具备：

| # | 证据项 | 验证方式 |
|---|--------|---------|
| 1 | 涉及文件路径（相对项目根） | ls 验证文件真实存在 |
| 2 | 涉及函数/接口/类名 | 在文件内 grep 命中 |
| 3 | 自动化测试结果（如适用） | 跑测试，记录 PASS/FAIL |
| 4 | 手动测试用户确认（如适用） | 用户在 phase-N-manual-test.md 勾选 |
| 5 | 改动时间戳（精确到分钟） | 文件 mtime 或对账时刻 |

**缺任一项 → 状态保持"待验证"，不得标记完成。**

### 对账机制（每轮 Phase 末强制执行）

主控更新 progress.md 前必须执行：

1. 读取 progress.md 中所有"已完成"条目的证据
2. 逐条 ls + grep 验证文件 / 函数 / 测试
3. 验证失败的条目 → 状态打回"待返工"，记录失败原因
4. 输出 `outputs/orchestration/reconcile-report-iteration-N.md`
5. 对账报告生成后，才能更新 progress.md

### 认知一致性规则

两个 Agent 对同一任务状态不一致时：
- 以"产物清单 + 文件实存"为准
- 不以"Agent 自述状态"为准
- 文件不存在 = 任务未完成（不管谁怎么说）

### 产物清单标准格式（开发 Agent 提交时必用）

```markdown
## Task ID: <id>
- [x] 判定项 1：xxx（验证：grep 'fn_name' app/Http/Controllers/AuthController.php）
- [x] 判定项 2：...
- [ ] ⚠️ 判定项 N：未实现 + 原因：...

### 涉及文件
- app/Http/Controllers/AuthController.php（新增）
- database/migrations/2026_05_22_xxx_create_users_table.php（新增）

### 涉及函数 / 接口
- AuthController::register()
- AuthController::login()
- POST /api/v1/auth/register

### 测试结果
- 自动化：PHPUnit AuthControllerTest 6/6 PASS
- 手动：见 outputs/testing/phase-2-manual-test.md 第 1-5 条

### 时间戳
- 2026-05-22 14:35
```

## 反脱节红线

- ❌ progress.md 写"已完成 X 功能"，但 X 对应文件不存在 → 红线
- ❌ task-spec 描述"实现 xxx"但无 ≥5 条可验证判定项 → 红线
- ❌ 测试报告"实际结果"全为"待填写" → 红线
- ❌ 设计 Agent 未拿到 design-brief 就出图 → 红线
- ❌ 开发 Agent 在 task-spec 外"顺便加点东西" → 红线

红线触发 → 立即阻断 Phase 切换 + 记入 EXECUTION_POLICY 返工日志。
