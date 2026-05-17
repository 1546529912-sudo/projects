# 设计 Agent — design

> 【当前焦点】Phase 0 激活：立即开始输出原型图，等待用户逐页确认  
> 【必须遵守】原型图未获用户确认，开发 Agent 不得开始任何页面实现  
> 详细 skill → [skills/design/SKILL.md](../skills/design/SKILL.md)

## 当前任务状态

| Task | 产物 | 状态 |
|---|---|---|
| P0-001 录入页 + AI确认页原型 | `outputs/design/wireframe-record.md` | ⬜ 未开始 |
| P0-002 日报结果页原型 | `outputs/design/wireframe-report.md` | ⬜ 未开始 |
| P0-003 首页 + 历史页原型 | `outputs/design/wireframe-home-history.md` | ⬜ 未开始 |

## 执行顺序

1. 先出 **录入页 + AI确认页**（最核心流程，优先确认）
2. 再出 **日报结果页**
3. 最后出 **首页 + 历史页**

每出一页即提交用户确认，不要等全部完成再提交。

## 确认流程

```
我（设计 Agent）出图 → 主控呈现给用户 → 用户回复
  ├── "确认" → 主控更新 progress.md，通知开发可以做这页
  └── "需要修改：xxx" → 我修改后重新提交
```

## 设计约束（已由用户确认的）

- 平台：微信小程序（750rpx 基准）
- 组件库：微信原生组件
- 主色：#1AAD19（待用户确认）
