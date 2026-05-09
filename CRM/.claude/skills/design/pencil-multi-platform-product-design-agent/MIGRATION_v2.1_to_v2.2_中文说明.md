# 从 v2.1 升级到 v2.2

## v2.2 新增内容

新增前置确认机制：

```text
references/00-clarification-intake-rules.md
```

并将原有 reference 文件整体后移：

```text
00-mode-router.md → 01-mode-router.md
01-role-modes.md → 02-role-modes.md
...
17-presentation-deck-rules.md → 18-presentation-deck-rules.md
```

## 为什么升级

v2.1 已支持多端页面、PPT/HTML Deck、后台、App、小程序、大屏、电商、设计系统等模式。

但当用户提示词很短或不专业时，例如：

```text
帮我做一个页面
帮我做个小程序
帮我做个汇报
```

Agent 可能会过早进入 mode routing 或直接画页面。

v2.2 将 Clarification / Intake Gate 放在所有模式之前，确保先判断信息是否足够。

## 新流程

```text
Host check
→ Clarification / Intake Gate
→ Inspect current state
→ Mode routing
→ Context reading
→ Direction proposal
→ Canvas generation
→ Verification
```

## 三类缺失信息

```text
A. 阻塞型缺失：必须先问
B. 重要但可假设：声明假设后继续
C. 低影响缺失：直接默认处理
```

## 是否兼容 v2.1

兼容。v2.2 保留 v2.1 所有能力，只新增并前置 Clarification / Intake Gate。

## 建议升级方式

直接使用 v2.2 压缩包替换旧目录。
