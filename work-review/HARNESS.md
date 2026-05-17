# HARNESS.md — 协作运行机制

> 【当前焦点】Iteration 1 运行中  
> 【必须遵守】所有 Agent 必须先读本文件再开始工作

---

## 一、启动协议

每个 Agent 启动时必须按顺序执行：

```
1. 读 README.md → 确认当前焦点
2. 读 progress.md → 确认自己的任务状态
3. 读本角色的 SKILL.md → 确认职责和工作流
4. 读本轮 runbook → outputs/orchestration/iteration-1-runbook.md
5. 开始工作
```

---

## 二、进度回写机制

### 规则

- **只有主控 Agent** 可以修改 `progress.md`
- 子 Agent 完成任务后，向主控提交产物摘要
- 主控验收后回写 progress
- 回写模板：→ [outputs/orchestration/progress-update-template.md](outputs/orchestration/progress-update-template.md)

### 回写时机

| 事件 | 回写内容 |
|---|---|
| 任务完成 | 状态改为 ✅，填写产物链接 |
| 任务阻塞 | 状态改为 🔴，写入当前问题区 |
| 任务进行中 | 状态改为 🔄 |
| 返工触发 | 备注返工次数，状态改为 ⚠️ |

---

## 三、防重复执行规则

- 每个 Task ID 在 progress.md 中唯一
- Agent 开始任务前先检查任务状态
- 状态为 ✅ 的任务不得重新执行，除非主控明确触发重置
- 同一 Agent 不得并行执行同一 Task

---

## 四、返工机制

```
第 1-3 次返工：子 Agent 自主处理
第 4 次返工：子 Agent 停止，向主控提交 blocker
主控收到 blocker → 分析根因 → 给出定向指令 → 子 Agent 执行 1 次
如仍未通过 → 主控直接介入处理或决策降级
```

---

## 五、Blocker 处理流程

```
发现阻塞
→ 子 Agent 填写 blocker 模板
→ 提交给主控 Agent
→ 主控同步写入 progress.md 当前问题区
→ 主控决定：继续等待 / 调整方案 / 降级功能
→ blocker 解除后更新 progress.md
```

Blocker 模板：→ [outputs/orchestration/blocker-escalation-template.md](outputs/orchestration/blocker-escalation-template.md)

---

## 六、幂等规则

- 所有云函数写入链路必须支持幂等（避免重复保存、重复生成）
- 云数据库集合初始化必须可重复执行（检查集合和权限是否已存在）
- AI 调用失败必须有重试机制（最多 3 次，指数退避）
- 文件上传必须检查重复（基于 MD5）

---

## 七、长流程兜底

- AI 调用超时上限：30 秒
- 超时后自动返回错误，不挂起
- 用户可手动触发重试
- 关键流程必须有 loading 状态和错误状态

---

## 八、设计确认门控（UI 页面开发前必须通过）

```
设计 Agent 输出原型图（文字版线框或截图）
→ 主控通知用户确认
→ 用户确认 ✅ 或提修改意见
→ 设计 Agent 修改后再次提交
→ 用户最终确认
→ 主控在 progress.md 标记"设计已确认"
→ 开发 Agent 才可以启动该页面的实现
```

**所有 UI 页面任务的状态流必须是**：
```
设计稿待确认 → [用户确认] → 开发中 → 测试中 → 完成
```

跳过"用户确认"步骤的产物，主控必须打回。

---

## 九、阶段切换条件

| 从 Phase | 切换到 Phase | 条件 |
|---|---|---|
| 0 设计确认 | 1 工程初始化 | 核心页面原型已获用户确认 |
| 1 初始化 | 2 核心功能 | 云函数健康检查通过 + 云开发联通 + 基础测试通过 |
| 2 核心功能 | 3 AI 集成 | P0 功能完成 + 测试 Agent 验收通过 |
| 3 AI 集成 | 4 集成测试 | AI Workflow 稳定 + Schema 校验通过 |
| 4 集成测试 | 5 发布 | 全量测试通过 + 主控审批 |
