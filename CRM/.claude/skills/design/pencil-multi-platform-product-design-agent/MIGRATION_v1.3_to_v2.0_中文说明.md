# 从 v1.3 升级到 v2.0

## v1.3 是什么

v1.3 主要解决：

- Pencil MCP / IDE 插件模式识别
- batch_design 引用错误
- 企业后台 / SaaS Dashboard 页面设计

## v2.0 升级了什么

v2.0 把 Skill 升级为“Pencil 多端产品设计代理 Skill”。

新增：

```text
00-mode-router.md
10-responsive-web-landing-page-rules.md
11-mobile-app-design-rules.md
12-wechat-mini-program-rules.md
13-data-visualization-big-screen-rules.md
14-ecommerce-campaign-rules.md
15-design-system-component-library-rules.md
16-cross-platform-consistency-rules.md
```

## 是否兼容 v1.3

兼容。v2.0 保留了：

- 企业后台模式
- Pencil MCP 画布规则
- IDE 插件模式
- batch_design 安全规则
- 代码库同步
- 质量验证
- 失败恢复

## 如何升级

建议直接替换原目录：

```text
旧：pencil-design-agent/
新：pencil-multi-platform-product-design-agent/
```

如果你的工具固定引用旧 Skill 名称，也可以把新目录重命名为原目录名，但建议优先使用新名称。
