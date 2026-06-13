# HARNESS.md · 防错与反脱节机制

## 核心信条
**任何 Agent 说"完成"，主控都要拿 `ls`/`grep` 真实验证。文件不存在 = 任务未完成，不管 Agent 怎么说。**

## 反脱节四道闸

### 闸 1：产物清单强制
每个开发任务必须产出格式化清单（见 [.agents/development/SKILL.md](/.agents/development/SKILL.md) §产物清单格式）。
**缺清单 → progress.md 不得标完成。**

### 闸 2：文件真实存在校验
主控更新 progress.md 前，对清单中每个文件执行 `ls`，对每个声称的函数/接口执行 `grep`。
**任一项不通过 → 状态打回"待返工"。**

### 闸 3：测试结果分类
- 自动化测试：必须有"实际结果"栏位内容，不允许"待填写"
- 手动测试：必须用户已勾选完成

### 闸 4：对账报告强制
每轮 Phase 切换前生成 `outputs/orchestration/reconcile-report-iteration-N.md`。
**对账未通过 → 禁止切换 Phase。**

## 推导内容标注

所有 Agent 推导产生的假设必须标注：
- ✅ **【用户明确需求】**：来自 PRD 或用户决策（不可改）
- ⚠️ **【待确认默认值】**：Agent 推导（用户未拍板前不锁定）

## 进度脱节检测

主控对账时如发现：
- progress.md 中"已完成"条目的文件不存在 → 状态打回 + 记录在对账报告
- 两个 Agent 对同一任务描述不一致 → 以"产物清单"为准
- 同类问题连续 2 次出现 → 主控提前介入

## Skill 调用对账

每个 Agent 工作日志必须包含"本任务匹配到的 skill 清单"。主控对账时检查：
- 产品 Agent 若未在日志中体现 `prd-development` / `user-story` / `user-story-splitting` 等 skill 的使用 → 视为方法不规范
- 设计 Agent 若未访问 Airbnb 仓库 → design-brief.md 推回返工

## 上下文管理

- README.md ≤ 50 行（超出必须裁剪到对应文档）
- progress.md 已完成内容下沉到归档区，不占用前 1/3 视野
- 每份文档前 1/3 必须有【当前焦点】区块
