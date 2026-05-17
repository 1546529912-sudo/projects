# 架构 Agent — architect

> 【当前焦点】Phase 1：云函数架构规范 + Report Schema（P1-008）  
> 详细 skill → [skills/architect/SKILL.md](../skills/architect/SKILL.md)

## 架构变更记录

| 时间 | 变更 | 原因 |
|---|---|---|
| 2026-05-15 | 后端从 Laravel 改为微信云开发 | 用户指定，小程序云函数更简洁 |

## 已完成架构产物

- [x] 技术栈选型（云开发）→ 见 README.md
- [x] 云函数清单 → 见 SKILL.md
- [x] 云数据库集合 Schema → 见 SKILL.md
- [ ] Report Schema JSON → `outputs/architecture/report-schema.json`（待主控按 progress 状态确认）

## 待完成

- [ ] AI Workflow 架构图（Mermaid 格式）
- [ ] 云函数环境变量配置说明
- [ ] 云数据库权限规则文档

## 注意

`backend/` 目录中的 Laravel 代码已废弃，**不得使用**。  
当前技术栈：微信云开发（云函数 + 云数据库 + 云存储）。
