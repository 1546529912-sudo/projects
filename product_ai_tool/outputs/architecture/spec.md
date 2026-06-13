# Architecture Spec

## 正式技术栈声明

本规范默认实现形态为 **Laravel 单体**：**Blade + Alpine.js / 原生 JS** 宿主页 + **MySQL** 持久化 + 服务端 **`deepseek-v4-flash`**。仓库 `web/`（Next.js）**仅作原型**，不映射为正式路由、Service 或 API 契约。

与环境变量约定见 [tech-selection.md](./tech-selection.md) 顶部「DeepSeek 接入约定」。

## 本轮目标

- 在已确认的 PHP 优先技术方向上，补齐 `product_ai_tool` 的完整架构规范
- 让产品、开发、测试可以围绕同一份技术文档推进 MVP
- 明确单 HTML Demo、iframe、标注、AI 修改、版本管理之间的系统边界

## 总体架构

推荐采用单体 Web 应用结构：

- 服务端：Laravel
- 页面渲染：Blade
- 轻交互：Alpine.js / 原生 JavaScript
- 数据存储：MySQL
- AI 调用：Laravel 服务端直接请求 `deepseek-v4-flash`

原则：

- MVP 优先单体交付，不拆多服务
- 标注数据与 Demo HTML 严格分离
- 所有 AI 生成和 AI 修改结果都写入版本表，不直接覆盖历史内容

## 系统模块划分

### 1. 工作台模块

职责：

- 展示需求输入、模型信息、当前 Demo 信息
- 承载 iframe 预览区
- 承载右侧标注列表与编辑区
- 展示协议状态、当前 `pageKey`、当前版本

### 2. Demo 生成模块

职责：

- 接收用户输入的需求
- 调用 `deepseek-v4-flash`
- 生成完整单 HTML Demo
- 保存为 Demo 初始版本

### 3. Demo 预览模块

职责：

- 输出当前版本 HTML
- 用 iframe 渲染 Demo
- 接收 `postMessage`
- 管理当前 `pageKey`

### 4. 标注模块

职责：

- 在宿主页 overlay 上渲染标注
- 保存标注位置与内容
- 按 `demoId + pageKey` 过滤标注
- 为后续 `stateKey` 留扩展位

### 5. AI 修改模块

职责：

- 组装当前 HTML、标注、页面上下文
- 调用 `deepseek-v4-flash`
- 返回修改后的完整 HTML
- 创建新版本

### 6. 版本模块

职责：

- 保存每次生成和修改后的 HTML
- 维护当前版本指针
- 提供版本列表与恢复能力

## 推荐目录结构

以下为 Laravel 侧推荐结构：

```text
app/
├── Http/
│   ├── Controllers/
│   │   ├── WorkbenchController.php
│   │   ├── DemoController.php
│   │   ├── AnnotationController.php
│   │   ├── VersionController.php
│   │   └── AiController.php
├── Models/
│   ├── Demo.php
│   ├── DemoVersion.php
│   └── Annotation.php
├── Services/
│   ├── DemoGenerationService.php
│   ├── DemoRevisionService.php
│   └── DeepSeekClient.php
resources/
├── views/
│   ├── workbench/
│   │   └── index.blade.php
│   └── demos/
│       └── show.blade.php
routes/
├── web.php
├── api.php
database/
├── migrations/
```

## 数据模型

## demos

用途：

- 记录一个 Demo 任务本体
- 维护当前生效版本

建议字段：

- `id`
- `title`
- `prompt`
- `model`
- `current_version_id`
- `created_at`
- `updated_at`

说明：

- `model` 第一版固定为 `deepseek-v4-flash`

## demo_versions

用途：

- 保存每次生成或修改后的完整 HTML

建议字段：

- `id`
- `demo_id`
- `version_no`
- `html_code`
- `model`
- `source_type`
- `source_annotation_id`
- `prompt`
- `created_at`

字段说明：

- `source_type`：`initial_generate` / `annotation_revision` / `rollback`
- `source_annotation_id`：若本版本由某条标注触发修改，则记录该标注 ID

## annotations

用途：

- 独立保存标注数据，不嵌入 Demo HTML

建议字段：

- `id`
- `demo_id`
- `demo_version_id`
- `page_key`
- `state_key`
- `x_percent`
- `y_percent`
- `title`
- `description`
- `type`
- `status`
- `created_at`
- `updated_at`

说明：

- `state_key` 第一版可空，仅预留
- `demo_version_id` 用于追踪标注创建时依附的 HTML 版本

## 数据关系

- `demos` 1:n `demo_versions`
- `demos` 1:n `annotations`
- `demo_versions` 1:n `annotations`（通过 `demo_version_id` 建立创建时关联）
- `demos.current_version_id` -> `demo_versions.id`

## 路由建议

## 页面路由

- `GET /workbench`
  - 工作台主页
- `GET /demos/{demo}/preview`
  - 输出当前版本 HTML，供 iframe 加载

## API 路由

### Demo

- `POST /api/demos`
  - 创建 Demo 并生成初始版本
- `GET /api/demos/{demo}`
  - 获取 Demo 基本信息
- `GET /api/demos/{demo}/versions`
  - 获取版本列表

### 标注

- `GET /api/demos/{demo}/annotations`
  - 获取标注列表
  - 支持参数：`pageKey`、`status`
- `POST /api/demos/{demo}/annotations`
  - 创建标注
- `PATCH /api/annotations/{annotation}`
  - 更新标注
- `DELETE /api/annotations/{annotation}`
  - 删除标注

### AI 修改

- `POST /api/annotations/{annotation}/revise`
  - 基于单条标注修改 HTML

### 版本

- `POST /api/demos/{demo}/versions/{version}/restore`
  - 恢复到指定版本

## 接口契约建议

## 创建 Demo

请求：

```json
{
  "title": "电商详情页 Demo",
  "prompt": "生成一个商品详情页 Demo",
  "model": "deepseek-v4-flash"
}
```

响应：

```json
{
  "ok": true,
  "demoId": 1,
  "currentVersionId": 10,
  "previewUrl": "/demos/1/preview"
}
```

## 创建标注

请求：

```json
{
  "demoVersionId": 10,
  "pageKey": "detail",
  "stateKey": null,
  "xPercent": 42.5,
  "yPercent": 31.2,
  "title": "优化按钮文案",
  "description": "按钮文案不够明确",
  "type": "修改建议",
  "status": "未处理"
}
```

响应：

```json
{
  "ok": true,
  "annotationId": 1001
}
```

## 基于标注修改

请求：

```json
{
  "userInstruction": "让按钮更突出，并修改文案"
}
```

响应：

```json
{
  "ok": true,
  "demoId": 1,
  "newVersionId": 11,
  "previewUrl": "/demos/1/preview",
  "annotationStatus": "已完成"
}
```

## iframe 承载方案

第一版推荐两种方式：

### 方案 A：iframe 加载预览路由

- iframe `src` 指向 `/demos/{demo}/preview`
- 后端输出完整 HTML
- 优点：
  - 更接近真实生产环境
  - 更便于版本切换
  - HTML 调试更直接
- 缺点：
  - 路由和权限需更清晰处理

### 方案 B：iframe `srcdoc`

- 后端把 HTML 文本返回给工作台
- 前端直接写入 `srcdoc`
- 优点：
  - 开发简单
  - 第一轮原型验证快
- 缺点：
  - 版本切换和调试不如独立路由清晰

建议：

- 原型可以先用 `srcdoc`
- 正式 PHP 版更推荐使用预览路由方案

## postMessage 协议

## 消息类型

### `DEMO_READY`

用途：

- Demo 首次完成渲染后通知宿主

示例：

```json
{
  "type": "DEMO_READY",
  "pageKey": "home",
  "demoId": "demo_xxx"
}
```

### `DEMO_PAGE_CHANGE`

用途：

- Demo 内部页面变化时通知宿主

示例：

```json
{
  "type": "DEMO_PAGE_CHANGE",
  "pageKey": "detail",
  "demoId": "demo_xxx"
}
```

### `DEMO_STATE_CHANGE`

用途：

- 同一页面内状态切换时预留

示例：

```json
{
  "type": "DEMO_STATE_CHANGE",
  "pageKey": "detail",
  "stateKey": "modal_open",
  "demoId": "demo_xxx"
}
```

### `DEMO_ACTION`

用途：

- 记录关键交互动作，第一版预留

## 宿主页协议处理规则

- 仅接受约定类型消息
- 若收到 `DEMO_PAGE_CHANGE`，更新当前 `pageKey`
- 标注列表和 overlay 仅显示当前 `pageKey` 对应数据
- 对未知消息类型直接忽略

## AI 调用链路

## 初次生成

1. 用户输入需求
2. 后端组装生成提示词（须强制包含单 HTML、postMessage、`pageKey` 约束；与 `产品功能开发.md` 一致）
3. 通过 `DeepSeekClient` 调用 **`deepseek-v4-flash`**（模型名来自 `config('services.deepseek.model')` 或 `DEEPSEEK_MODEL`）
4. 校验并提取完整 HTML
5. 创建 `demos`
6. 创建 `demo_versions(version_no=1)`
7. 将该版本设为当前版本

## 基于标注修改

1. 读取当前版本 HTML
2. 读取当前标注
3. 组装修改上下文：
   - 当前 HTML
   - `demoId`
   - `pageKey`
   - `stateKey`
   - 标注位置
   - 标注内容
   - 用户补充要求
4. 调用 **`deepseek-v4-flash`**（与其它生成链路同一 Client）
5. 返回完整新 HTML
6. 创建新版本
7. 将标注状态更新为“已完成”
8. 将新版本设为当前版本

## 版本恢复链路

1. 用户选择目标历史版本
2. 系统创建一次恢复记录或直接切换当前版本指针
3. 刷新 iframe 预览

建议：

- 第一版可直接更新 `current_version_id`
- 若希望完整审计，可额外生成一条 `rollback` 类型版本记录

## 标注渲染规则

- 标注层只存在于宿主页，不存在于 Demo HTML 内
- 标注位置使用百分比
- 标注显示条件：
  - `demo_id` 匹配
  - `page_key` 匹配
  - 若未来启用 `state_key`，则进一步匹配状态

## 安全边界

- AI Key 只保存在服务端环境变量
- Demo HTML 输出前不执行额外危险脚本注入
- iframe 使用最小权限 sandbox
- 标注数据由宿主渲染，绝不拼进 HTML 版本内容
- AI 返回结果需要基本有效性校验：
  - 是否为完整 HTML
  - 是否包含基本 `pageKey` 和协议要求

## 错误处理建议

### AI 调用失败

- 不覆盖当前版本
- 返回错误提示
- 允许用户继续使用当前版本

### HTML 不可解析

- 视为生成失败
- 不创建新版本
- 记录错误日志

### 协议消息缺失

- 若 Demo 未发送 `DEMO_READY` 或 `DEMO_PAGE_CHANGE`
- 宿主页记录协议异常
- 测试阶段应打回

## 测试重点

- Demo HTML 是否独立于标注系统
- iframe 与宿主页消息是否正常
- 标注是否只按当前 `pageKey` 展示
- AI 修改后是否创建新版本
- 恢复版本后预览是否正确切换

## 风险与待确认项

- 第一版 overlay 复杂度是否会超出 Blade + Alpine.js 的舒适区
- 版本恢复是直接切换指针，还是必须生成回滚版本
- Demo HTML 存数据库字段还是文件落盘，需结合未来规模评估

## 建议结论

- 该项目适合采用 **Laravel 单体架构**
- MVP 不需要 Next.js 作为最终生产技术方案
- **正式实现为 Laravel + MySQL + Alpine.js / 原生 JS**；`web/` 原型仅参考布局与协议验证思路

完成信号：`ARCH_SPEC_READY`
