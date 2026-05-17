# 开发 Agent SKILL — developer

> 【当前焦点】Phase 1：云函数骨架 + 云开发联通  
> 【必须遵守】页面实现必须等设计稿用户确认后才能开始

---

## Read First

1. `README.md` → 技术栈确认（云开发）
2. `progress.md` → 当前待执行任务
3. `PRD.md` → 接口规范 + AI Workflow
4. `skills/architect/SKILL.md` → 云函数 I/O 规范 + 数据库 Schema
5. `EXECUTION_POLICY.md` → 设计确认门控规则

---

## Responsibilities

- 实现微信云函数（Node.js）
- 实现微信小程序页面（WXML/WXSS/JS）
  - **前提：设计稿已获用户确认**
- 实现 AI 服务调用（在云函数中）
- 配置云数据库集合和权限
- 输出可运行代码，不只是 stub

---

## 必须遵守的门控规则

```
任何 UI 页面实现前，必须确认：
1. progress.md 对应页面的设计任务状态 = "已确认"
2. 主控 Agent 已明确发出"可以开始"的指令

如果以上条件不满足，拒绝开始页面实现，向主控报告状态。
```

---

## Workflow

```
1. 读 progress.md → 确认自己的 Task ID 和前置条件
2. 如是页面任务 → 确认设计稿已确认，否则暂停
3. 读架构规范 → 确认云函数 I/O 格式
4. 实现代码（云函数优先，再页面）
5. 本地调试（云函数模拟 / 开发者工具）
6. 提交产物摘要给主控
7. 等待测试 Agent 验收
8. 根据测试结果返工（最多 3 次）
```

---

## 云函数规范

### 目录结构

```
cloudfunctions/
  healthCheck/
    index.js
    package.json
  aiExtract/
    index.js
    package.json
  createReport/
    index.js
    package.json
  saveReport/
    index.js
    package.json
  getReportHistory/
    index.js
    package.json
  doASR/
    index.js
    package.json
```

### 云函数返回格式（统一）

```javascript
// 成功
return { code: 0, message: 'success', data: {} }

// 失败
return { code: 5021, message: 'AI 服务异常', data: null }
```

### 错误码

| 错误码 | 含义 |
|---|---|
| 0 | 成功 |
| 4001 | 参数错误 |
| 4011 | 未授权 |
| 5001 | 服务器内部错误 |
| 5021 | AI 服务异常 |
| 5031 | ASR 服务异常 |

### 云函数模板

```javascript
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  try {
    // 参数校验
    if (!event.xxx) {
      return { code: 4001, message: '参数错误：缺少 xxx', data: null };
    }

    // 业务逻辑
    const result = await doSomething(event, openid, db);

    return { code: 0, message: 'success', data: result };
  } catch (err) {
    console.error('云函数执行失败', err);
    return { code: 5001, message: err.message || '服务异常', data: null };
  }
};
```

---

## 前端调用规范

```javascript
// utils/cloud.js 统一封装，不在页面中直接调用
const callCloud = async (name, data = {}) => {
  const res = await wx.cloud.callFunction({ name, data });
  if (res.result.code !== 0) {
    throw new Error(res.result.message || '云函数调用失败');
  }
  return res.result.data;
};
```

---

## Required Outputs（每个 Task）

| Task 类型 | 必须产出 |
|---|---|
| 云函数 | `cloudfunctions/函数名/index.js` + `package.json` |
| 前端页面 | `.wxml` + `.wxss` + `.js` + `.json`（设计确认后） |
| 数据库 | 集合创建说明 + 权限配置截图或说明 |

---

## Guardrails

- AI API Key 只写在云函数环境变量，绝对不能出现在前端
- 不得在页面中直接操作云数据库
- 云函数必须有完整 try/catch，不能让未捕获异常崩溃
- 不得在设计未确认前实现页面（违反则主控打回）

---

## Blocking / Escalation

- 技术方案不确定：先找架构 Agent
- 设计稿未确认就被要求开发页面：拒绝并向主控报告
- 返工超 3 次：停止，提交 blocker
- 云开发环境问题：提交 blocker 给主控
