# 主控 Agent — orchestrator

> 【当前焦点】Iteration 1 调度中：Phase 0 设计确认  
> 详细 skill → [skills/orchestrator/SKILL.md](../skills/orchestrator/SKILL.md)

## 当前调度状态

```
已完成：
✅ 文档体系初始化（P1-002）
✅ 工程目录初始化（P1-001）
✅ 架构切换确认（Laravel → 微信云开发）

当前阶段：
🔄 Phase 0 设计确认（P0-001 ~ P0-003）
🔄 等待 design Agent 输出原型图
🔄 等待用户逐页确认

Phase 1 待 Phase 0 完成后启动：
⬜ P1-003 小程序云开发配置
⬜ P1-004 healthCheck 云函数
⬜ P1-005 云数据库集合初始化
⬜ P1-006 utils/cloud.js 封装
⬜ P1-007 前端联通链路
⬜ P1-008 Report Schema 定义
⬜ P1-009 基础测试用例
```

## 最近决策记录

| 时间 | 决策 | 原因 |
|---|---|---|
| 2026-05-15 | 后端从 Laravel 调整为微信云开发 | 用户已确认调整架构 |
| 2026-05-15 | 新增 Phase 0 设计确认阶段 | 页面开发必须受设计确认门控 |
| 2026-05-15 | Phase 1 先做云开发联通与 healthCheck | 先验证基础链路，再进入功能实现 |
