# Reconcile Report · Iteration 21（Admin sidebar 折叠 · 响应式 + 持久化）

> 完成时间：2026-05-23

## 【当前焦点】

- 范围：iter-20 sidebar 固定 220px，窄屏挤；本迭代加折叠态（56px 仅图标）+ 自动按宽度 / 手动 toggle / localStorage 持久化
- 结论：AdminLayout 内部状态 `collapsed`；toggle 按钮浮在 brand 右边缘；窗口 < 1024px 默认折叠；用户一旦手动 toggle 就 override 自动判定
- 测试：PHPUnit 157/157 · pytest 22/22 · Vitest 18/18 + vue-tsc 清

## 设计取舍

| 选项 | 选择 | 理由 |
|------|------|------|
| collapse 触发 | **自动（< 1024px）+ 手动 toggle** | 桌面用户能记住偏好；窄屏开箱即用 |
| 用户偏好与自动冲突 | **手动一次就 override，落 localStorage** | 用户意图最高优先；下次浏览继承 |
| 折叠时尺寸 | **56px（仅图标）** | icons 16px + 两侧 padding；不浪费太多空间 |
| 折叠时显示分组名 | **隐藏** | 分组名只有文字；改用细分割线视觉分组 |
| 折叠时菜单 hover 提示 | **HTML `title` 原生 tooltip** | 简单可靠；不引入 tooltip 库 |
| toggle 按钮位置 | **brand 右边缘悬浮 ‹/›** | 折叠/展开都好按；不挤压菜单空间 |
| width 过渡 | **0.2s ease** | 视觉连贯；过短显得卡顿 |

## 前端产物

| 文件 | 说明 |
|------|------|
| `src/layouts/AdminLayout.vue` | + `collapsed` state（默认窗口宽度自动）；toggle 按钮；localStorage 持久化；窗口 resize listener；CSS `.admin-shell.collapsed .sidebar { width: 56px }` 各处文字 v-if 收起；hover title 原生 tooltip |

后端 0 改动。

## 行为矩阵

| 窗口宽度 | 历史 localStorage | 初始折叠态 | 备注 |
|---------|------------------|----------|------|
| ≥ 1024px | 无 | 展开 | 桌面默认 |
| < 1024px | 无 | 折叠 | 窄屏自动 |
| 任意 | `1` | 折叠 | 用户偏好 win |
| 任意 | `0` | 展开 | 用户偏好 win |

resize 行为：用户**未**手动 override 过 → 跟随窗口宽度；override 过 → 一直按 localStorage 不变。

## HARNESS 5 项硬约束

| # | 状态 |
|---|------|
| 产物清单 | ✅ 1 前端 |
| 文件 ls | ✅ |
| 自动化测试 | ✅ PHPUnit 157/157 · pytest 22/22 · Vitest 18/18 · vue-tsc 干净 |
| 手动验收 | ⏳ 浏览器拖窗口宽度 / 点 toggle |
| 对账报告 | ✅ |

## 用户手动验收

http://localhost:5173/

1. admin 进 /admin → 默认展开（如果窗口宽 ≥ 1024px）
2. 把浏览器窗口收窄到 < 1024px → sidebar 自动折叠为 56px 仅图标
3. 点 brand 右侧的圆形按钮 `‹` → 折叠；`›` → 展开
4. 折叠态把鼠标悬在某菜单项上 → 原生 tooltip 显示"库存预警"等
5. 手动 toggle 一次后 → 拉宽 / 收窄窗口都不会自动覆盖你的选择（用户意图最高）
6. 关闭浏览器再开 → 上次的折叠态从 localStorage 恢复

## 风险与已知问题

| 项 | 说明 |
|----|------|
| 移动端 < 480px | 仍是 56px 固定 sidebar；真正移动端可能需要"覆盖式抽屉"，留 v2 |
| 折叠态分组名丢失 | 用细分割线代替；视觉上是分组但需要意会 |
| tooltip 用原生 title | 不能 styled；hover 延迟由浏览器决定（一般 1s）；嫌慢可换 vue-floating-ui |
| localStorage 容量 | 1 key (`admin.sidebar.collapsed`)，无风险 |
| SSR 不友好 | `window.innerWidth` 在 onMounted 才读；服务端渲染会闪一次，但本项目纯 SPA |

## iteration-22 候选

| 方向 | 简述 |
|------|------|
| 后台面包屑 | 深层页面定位（admin > 商品管理 > 编辑 #12） |
| 移动端覆盖式抽屉 sidebar | iter-21 的真·移动版 |
| label 协作冲突保护（updated_at 乐观锁） | iter-15 尾巴 |
| 主动登出所有设备 / 设备管理 | iter-18 延伸 |
| 失败作业按时间窗 / 类型 搜索 + 翻页 | iter-19 自身扩展 |
| pgvector / 真实快递鸟 | 阻塞，需用户提供 key |
