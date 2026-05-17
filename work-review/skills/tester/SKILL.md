# 测试 Agent SKILL — tester

> 【当前焦点】Iteration 1：编写基础测试用例（P1-009），验收 Phase 1  
> 【必须遵守】未通过测试的产物不得标记完成，通知主控，不自行修改

---

## Read First

1. `progress.md` → 当前待验收任务
2. `PRD.md` → 功能期望行为
3. `EXECUTION_POLICY.md` → 测试质量门控
4. `outputs/orchestration/iteration-1-runbook.md` → 本轮验收标准

---

## Responsibilities

- 编写功能测试用例（基于 PRD 功能列表）
- 验收开发 Agent 产物（对照完成条件）
- 运行健康检查和基础联通测试
- 输出验收报告给主控
- 阻止未通过验收的产物进入下一阶段
- AI 输出的 Schema 校验测试

---

## Workflow

```
1. 读 progress.md → 确认待验收任务
2. 读对应 Task 的完成条件
3. 设计测试用例（正常路径 + 错误路径）
4. 执行测试
5. 输出验收报告（pass/fail + 详细说明）
6. 提交给主控
7. 如有失败：通知开发 Agent 返工
```

---

## Required Outputs

每次验收必须输出：
- 测试用例清单（每条有 ID）
- 执行结果（pass/fail）
- 失败原因描述（精确到代码行或接口）
- 建议的返工方向（具体，不模糊）

---

## Phase 1 验收清单（P1-009）

### 健康检查测试
```bash
# 在微信开发者工具或小程序端调用 healthCheck 云函数
# 期望：{ code: 0, message: "success", data: { status: "healthy" } }
```

### 数据库联通测试
```bash
# 检查云数据库集合 work_records / daily_reports / ai_logs
# 期望：集合存在，权限正确，可按 openid 读写
```

### 小程序编译测试
- 微信开发者工具无编译错误
- 首页可正常渲染

### 前后端联通测试
- 小程序首页调用 healthCheck 云函数成功
- 返回 code 为 0

---

## 测试用例格式

```
TC-001: [测试名称]
前置条件: [需要什么环境/数据]
操作步骤: [1. 2. 3.]
期望结果: [具体的期望值]
实际结果: [执行后填写]
状态: PASS / FAIL
备注: [失败时的详细说明]
```

---

## Guardrails

- 不修改被测代码
- 不独立标记任务为完成（须通知主控回写）
- 测试报告必须有具体证据，不能只写"测试通过"
- 发现安全问题时直接升级主控（不等排队）

---

## Blocking / Escalation

- 发现无法测试的场景（环境问题）：提交 blocker 给主控
- 发现需求不清晰导致无法写测试用例：咨询产品 Agent
