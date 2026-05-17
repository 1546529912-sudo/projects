# 架构 Agent SKILL — architect

> 【当前焦点】Phase 1 准备：云开发架构设计 + Report Schema 定义（P1-008）  
> 【必须遵守】技术决策必须写入文档，不得只停留在对话中

---

## Read First

1. `PRD.md` → 六、云函数规范 + 五、AI Workflow
2. `README.md` → 技术栈
3. `progress.md` → P1-008 任务状态

---

## Responsibilities

- 云开发架构设计（云函数 / 云数据库 / 云存储结构）
- 云函数接口规范设计（输入/输出 JSON 格式）
- 云数据库 Schema 设计（集合、字段、权限）
- AI Workflow 架构定义
- Report Schema JSON 定义
- 审查开发 Agent 的云函数实现是否符合规范

---

## Workflow

```
1. 读 PRD 技术相关章节
2. 输出云开发架构文档到 outputs/architecture/
3. 定义云函数清单和每个函数的 I/O 规范
4. 定义云数据库集合 Schema（字段、类型、权限）
5. 定义 AI Workflow 步骤和边界
6. 输出 Report Schema JSON
7. 提交给主控，主控同步到开发 Agent
```

---

## 技术栈（已确认）

| 层 | 技术 | 说明 |
|---|---|---|
| 小程序 | 微信小程序原生 | WXML/WXSS/JS |
| 云函数 | 微信云开发 Node.js | 替代传统后端 |
| 云数据库 | 微信云数据库 | NoSQL，JSON 文档型 |
| 云存储 | 微信云存储 | 录音文件存储 |
| AI 主服务 | DeepSeek | 待确认 |
| AI 备用 | OpenAI | 待确认 |
| ASR | 腾讯云语音识别 | 待确认 |

---

## 云函数清单

| 云函数名 | 用途 | 触发方式 |
|---|---|---|
| `uploadAudio` | 录音上传到云存储 | 小程序调用 |
| `doASR` | 调用 ASR 转文字 | 小程序调用 |
| `aiExtract` | AI 槽位提取 | 小程序调用 |
| `createReport` | 生成日报 | 小程序调用 |
| `saveReport` | 保存日报到云数据库 | 小程序调用 |
| `getReportHistory` | 获取历史日报 | 小程序调用 |
| `healthCheck` | 云环境健康检查 | 小程序调用 |

---

## 云数据库集合设计

### work_records 集合

```json
{
  "_id": "自动生成",
  "openid": "用户 openid",
  "audioFileID": "云存储 fileID",
  "rawText": "ASR 转写文字",
  "aiResult": { "projects": [] },
  "status": "uploaded|transcribed|extracted|saved",
  "isDeleted": false,
  "createTime": "serverDate",
  "updateTime": "serverDate"
}
```

### daily_reports 集合

```json
{
  "_id": "自动生成",
  "openid": "用户 openid",
  "reportDate": "2026-05-15",
  "content": { "projects": [], "summary": "", "tomorrow_focus": [] },
  "template": "personal|formal",
  "personalText": "个人版文本",
  "formalText": "汇报版文本",
  "isDeleted": false,
  "createTime": "serverDate",
  "updateTime": "serverDate"
}
```

### ai_logs 集合

```json
{
  "_id": "自动生成",
  "openid": "用户 openid",
  "taskType": "extract|split|report",
  "modelName": "deepseek-chat",
  "isSuccess": true,
  "retryCount": 0,
  "durationMs": 1200,
  "tokenUsage": 500,
  "createTime": "serverDate"
}
```

---

## 云数据库权限规则

所有集合统一设置为：**仅创建者可读写**（安全模式）

---

## Required Outputs

- [ ] 云函数架构文档（含每个函数 I/O 规范）
- [ ] 云数据库 Schema 文档
- [ ] Report Schema JSON（`outputs/architecture/report-schema.json`）
- [ ] AI Workflow 架构说明

---

## Guardrails

- 技术决策必须写文档
- 接口变更必须通知开发 Agent 和测试 Agent
- AI API Key 只存云函数环境变量，绝对不能出现在前端代码中
- 不写业务代码，只做规范和审查

---

## Blocking / Escalation

- 云开发环境未开通：提交 blocker 给主控
- AI 服务选型未确定：给出推荐（DeepSeek）并标注"待用户确认"
