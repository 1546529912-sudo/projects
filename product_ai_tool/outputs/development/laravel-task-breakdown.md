# Laravel 开发任务拆分（正式栈）

**前提**：单体 **Laravel + MySQL + Blade + Alpine.js / 原生 JS**；默认模型 **`deepseek-v4-flash`**（服务端）。仓库 `web/`（Next.js）仅作原型参考。

**权威**：需求 [产品功能开发.md](../../产品功能开发.md)；接口与表结构 [outputs/architecture/spec.md](../architecture/spec.md)。

---

## 阶段 A — 工程基线

| ID | 任务 | 产出 / 验收 |
| --- | --- | --- |
| A1 | `composer create-project` Laravel 11+；`.env` 配 MySQL；`php artisan migrate:status` 可用 | 可本地 `serve` |
| A2 | 接入 **Alpine.js**（CDN 或 Vite 混合，项目内定一种并写 README 片段） | 工作台占位页可跑 `x-data` |
| A3 | 配置 `config/services.php`：`deepseek` 键读取 `DEEPSEEK_API_KEY`、`DEEPSEEK_API_BASE`、`DEEPSEEK_MODEL` | `config:cache` 无密文进仓 |
| A4 | 基础布局 Blade：`layouts/app.blade.php`、导航占位 | 与设计四区一致的最小骨架 |

**对齐 progress**：为 1～5 的开发提供仓库与配置基础，不单独对应某一勾选项。

---

## 阶段 B — 工作台壳 + 生成 + 预览 + 协议（progress 1～5）

| ID | 任务 | 对齐 progress |
| --- | --- | --- |
| B1 | `WorkbenchController@index` + 四栏 Blade（顶/左/中/右） | 1 |
| B2 | 左侧需求表单；模型展示为 `deepseek-v4-flash`（或下拉仅一项，避免误导多模型） | 2 |
| B3 | Migration：`demos`、`demo_versions`；Model 关联 | 3 · 14（表先就绪） |
| B4 | `DeepSeekClient`：HTTP 调用 Chat Completions 兼容接口；超时与错误映射 | 3 |
| B5 | `DemoGenerationService`：组 prompt（含单 HTML、postMessage、`pageKey` 约束）→ 落库 v1 → 更新 `current_version_id` | 3 |
| B6 | `GET /demos/{demo}/preview` 返回当前版本 `Content-Type: text/html; charset=UTF-8` | 4 |
| B7 | 中间 iframe：`src` 指向 preview URL；`sandbox` 按 spec 最小放权 | 4 |
| B8 | 宿主页：原生 `message` 监听 + 白名单 `type`；维护当前 `pageKey`（Alpine 或全局变量） | 5 |
| B9 | 右侧临时「协议调试」区（最近 N 条消息）可选，便于测试 | 5 |

**验收**：新建 Demo → DB 有版本 → iframe 可交互 → 切换 Demo 内页面 → 宿主 `pageKey` 更新。

---

## 阶段 C — 标注闭环（progress 6～10）

| ID | 任务 | 对齐 progress |
| --- | --- | --- |
| C1 | Migration：`annotations`；`state_key` 可空 | 8 |
| C2 | 预览/标注模式切换；标注模式下 overlay `pointer-events` 策略 | 6 |
| C3 | 点击 overlay 创建标注：`x_percent` / `y_percent`；`POST /api/demos/{demo}/annotations` | 7 · 8 |
| C4 | 点击 pin 打开编辑（标题、描述、类型、状态） | 9 |
| C5 | 列表与画布仅展示 `current pageKey` 下标注 | 10 |

---

## 阶段 D — 列表与维护（progress 11～12）

| ID | 任务 | 对齐 progress |
| --- | --- | --- |
| D1 | 右侧「当前页」列表 + 「全部标注」视图 + 按状态筛选 | 11 |
| D2 | 删除、状态更新；列表项 → 滚动/高亮对应 pin | 12 |

---

## 阶段 E — AI 修订（progress 13）

| ID | 任务 | 对齐 progress |
| --- | --- | --- |
| E1 | `DemoRevisionService`：组装 HTML + 单标注上下文 + 用户说明 | 13 |
| E2 | `POST /api/annotations/{annotation}/revise` → 新版本 + 可选标注标为已完成 | 13 |

---

## 阶段 F — 版本与风险提示（progress 14～15）

| ID | 任务 | 对齐 progress |
| --- | --- | --- |
| F1 | 每次生成/修订递增 `version_no`；记录 `source_type`、`source_annotation_id` | 14 |
| F2 | 版本列表 UI + 恢复当前版本指针（策略按 spec：直接指针或生成 rollback 记录） | 15 |
| F3 | 已有标注时「重新生成」前 Modal 风险提示文案（对齐需求 §2.6） | 15 |

---

## 依赖与并行

```text
A → B → C → D → E → F
```

- **C** 起可与 **B8/B9** 并行开发，但联调需 preview URL 稳定。
- **E** 依赖 **B4/B5** 的 DeepSeek 调用与 **C** 的标注数据。

---

## 显式不做（避免 scope creep）

- 不把 `web/` Next.js 迁回主路径；不复制其 `app/api/generate` 契约为唯一真理。
- 第一版不做多模型切换（除非产品变更 `progress`）。
- AI 生成物仍为**单文件 HTML**，非 Laravel/React 工程。

---

## 建议 Git 粒度

- `feat: workbench layout + migrations`
- `feat: deepseek client + demo generation`
- `feat: preview route + iframe + postMessage host`
- `feat: annotations api + overlay`
- `feat: revise demo from annotation`
- `feat: version list + restore + regenerate warning`

（实际由团队按 MR 大小调整。）
