# 开发 Agent — developer

> 【当前焦点】等待 Phase 0 设计确认完成后启动 Phase 1 云函数开发  
> 详细 skill → [skills/developer/SKILL.md](../skills/developer/SKILL.md)

## 门控检查（每次启动前必读）

```
当前设计确认状态：⬜ 未确认
→ 云函数任务：可以做（无需设计确认）
→ 页面实现任务：暂停，等待 progress.md 设计状态变为"已确认"
```

## 当前任务队列（Phase 1，设计确认后激活）

| Task | 是否需设计确认 | 状态 |
|---|---|---|
| P1-003 云开发配置 | 否 | ⬜ |
| P1-004 healthCheck 云函数 | 否 | ⬜ |
| P1-005 云数据库集合初始化 | 否 | ⬜ |
| P1-006 utils/cloud.js | 否 | ⬜ |
| P1-007 前端联通链路 | 部分（首页骨架） | ⬜ |

## 废弃说明

`backend/` 目录（Laravel）已废弃，不得继续开发。  
所有后端逻辑均在 `cloudfunctions/` 中实现。

## 云开发环境配置（待填入）

- AppID：your-appid（待确认）
- 云环境 ID：your-cloud-env-id（待确认）
