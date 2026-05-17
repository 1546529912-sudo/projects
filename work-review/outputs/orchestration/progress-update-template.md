# Progress 回写模板

> 本模板由主控 Agent 使用，回写 progress.md 时参考

---

## 任务完成回写

```markdown
| Task ID | 任务名 | 负责角色 | ✅ | 产物链接 | 完成条件已满足 |
```

回写时同步更新：
- 任务状态改为 ✅
- 填写产物路径或描述
- 在"回写记录"区追加一行

---

## 任务阻塞回写

```markdown
## 当前问题区

🔴 [Task ID] [任务名]
- 阻塞时间：YYYY-MM-DD
- 阻塞原因：[具体描述，不能只写"出问题了"]
- 影响范围：[哪些后续任务被阻塞]
- 处理方案：[当前的应对措施]
- 预计解除时间：[如果已知]
- blocker 文档：[链接到 blocker-escalation 文档]
```

---

## 阶段切换回写

```markdown
## Phase X → Phase X+1 切换

切换时间：YYYY-MM-DD
切换条件确认：
- [x] 条件1 已满足
- [x] 条件2 已满足
验收报告：[链接]
主控审批：orchestrator @ YYYY-MM-DD
```

---

## 返工记录回写

```markdown
| Task ID | 第 N 次返工 | 返工原因 | ⚠️ |
```

---

## 回写记录格式

```
| YYYY-MM-DD | 操作类型 | 内容摘要 |
```
