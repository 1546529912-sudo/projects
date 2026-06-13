# Reconcile Report · Iteration 13（AI Bad Case 收集 + 标注后台）

> 完成时间：2026-05-22

## 【当前焦点】

- 范围：AI 对话每条 AI 消息加 👍/👎，转人工自动入库 → 后台聚类 + 标签标注 → 闭环到 prompt/RAG 改进的数据源
- 结论：`ai_feedbacks` 表 + 2 触发路径（用户主动 manual / 转人工 auto_transfer） + 后台 [BadCasesPage](frontend/src/views/admin/BadCasesPage.vue) tabs + 标签弹窗 + Dashboard 卡片
- 测试：PHPUnit **125/125**（+7）· pytest 22/22 · Vitest 18/18 全 PASS

## 设计取舍

| 选项 | 选择 | 理由 |
|------|------|------|
| 每次反馈累加 vs 覆盖 | **覆盖**（updateOrCreate by message_id + user_id + source=manual） | 同一用户同一消息只一票，避免噪音 |
| 差评单独 vs 通用 feedback | **通用 rating(good/bad)** | 后台默认看 bad；good 也有价值（语料筛选） |
| 自动 bad case 来源 | **转人工时自动入库** | 转人工是最明确的"AI 答不好"信号；也保留 auto_lowconf / auto_negkw 扩展位 |
| tag 字段类型 | **JSON 数组** | 灵活，未来加新 tag 不用 migration |
| 聚类查询 | **PHP 端展开 JSON 计数** | SQLite/MySQL JSON 聚合不易跨方言；数据量小可接受 |

## 后端产物

| 文件 | 说明 |
|------|------|
| `database/migrations/2026_05_22_000015_create_ai_feedbacks_table.php` | message_id/conversation_id/user_id/rating/source/reason/tags/labeled/labeled_at/labeled_by |
| `app/Models/AiFeedback.php` | `$table='ai_feedbacks'`（手动指定，绕 Laravel 把 feedback 当不可数复数→`ai_feedback`）+ tags casts array |
| `app/Http/Controllers/Api/AiController.php` | +`submitFeedback(POST /ai/feedbacks)` 用户路径；sendMessage 中 transfer_to_human → 自动 AiFeedback::create source=auto_transfer |
| `app/Http/Controllers/Api/AdminAiFeedbackController.php` | index/label/stats 三方法 |
| `routes/api.php` | +`POST /ai/feedbacks`（用户）+ admin 三条 |
| `tests/Feature/AiFeedbackTest.php` | 7 测试：用户提交 / 覆盖 / 跨用户 403 / 非 AI 消息 422 / admin 列表+计数 / admin 标注 / admin 聚类 |

## 前端产物

| 文件 | 说明 |
|------|------|
| `src/components/AiDrawer.vue` | 每条 AI 消息下加 👍/👎；差评展开理由输入框；本地缓存避免重复提交 |
| `src/api/admin-bad-case.ts` | adminListBadCases / adminLabelBadCase / adminBadCaseStats 三 API + 类型 |
| `src/views/admin/BadCasesPage.vue` | 顶部聚类（by_source/by_tag）+ tab(未标注/已标注/全部) + 表格 + **标签弹窗（6 预设 + 自由输入逗号分隔）** |
| `src/views/admin/DashboardPage.vue` | + 待标注 AI Bad Case 黄色警告卡片 |
| `src/router/index.ts` | + /admin/bad-cases |
| `src/views/profile/MePage.vue` | admin 快捷入口加 "AI Bad Case →" |

## 端到端实测

```bash
# 1. admin 看聚类（空库时）
$ curl -H "Authorization: Bearer <admin>" /api/v1/admin/ai/feedbacks/stats
{"code":0,"data":{"by_source":[],"by_tag":[],"unlabeled_bad":0,"total_bad":0}}

# 2. buyer 试图调 admin → 403（iter-12 中间件兜底）
$ curl -H "Authorization: Bearer <buyer>" /api/v1/admin/ai/feedbacks
{"code":403,"message":"需要管理员权限"}
```

## 关键测试 case

| 测试 | 验证 |
|------|------|
| `AiFeedbackTest.test_feedback_overrides_when_resubmitted` | 同用户同消息先 good 再 bad → 只剩 1 条（bad，含 reason） |
| `AiFeedbackTest.test_cannot_feedback_other_users_message` | 跨用户调 → 403，不入库 |
| `AiFeedbackTest.test_cannot_feedback_non_ai_message` | message_id 指向 user 消息 → 422 |
| `AiFeedbackTest.test_admin_lists_bad_cases_with_unlabeled_count` | rating=bad + labeled=0 过滤；good 不出现；unlabeled_bad_count=2 |
| `AiFeedbackTest.test_admin_stats_aggregates_by_source_and_tag` | by_source: manual=1, auto_transfer=1；by_tag: 知识缺失=2（跨 2 条 fb），答非所问=1 |

## HARNESS 5 项硬约束

| # | 状态 |
|---|------|
| 产物清单 | ✅ 6 后端 + 6 前端 |
| 文件 ls | ✅ |
| 自动化测试 | ✅ PHPUnit 125/125（+7）· pytest 22/22 · Vitest 18/18 |
| 手动验收 | ⏳ 浏览器 AI 对话踩/赞 → /admin/bad-cases 看到记录 |
| 对账报告 | ✅ |

## 用户手动验收

http://localhost:5173/

1. 任意账号登录 → 点右下角 AI 浮按钮 → 发一条消息
2. AI 回复下出现 👍 / 👎 按钮 → 点 👎 → 展开"哪里不对？"输入框
3. 触发转人工的语句（"我要找客服"）→ 自动产生 source=auto_transfer 的 bad case
4. admin（13800000001/admin123）→ /admin → 看到"待标注 AI Bad Case"卡片
5. 点进 /admin/bad-cases → 看到聚类 + 列表 → 选预设标签 → 保存
6. tab 切到"已标注" → 看到带标签的记录；切回"未标注"该条消失

## 风险与已知问题

| 项 | 说明 |
|----|------|
| 自动反馈源仅 transfer_to_human | 未实现 auto_lowconf（confidence 低于阈值时自动入库），留 source 枚举位 |
| feedback 不可数复数 | Laravel 默认 `AiFeedback`→`ai_feedback` 单数；用 `$table` 手动指定 |
| 标签未建枚举表 | 当前 tag 自由字符串；如果运营标准化想做 controlled vocabulary，需另建 tags 表 + 关联 |
| 数据导出 | 当前只能在后台看；尚未做 CSV 导出供 fine-tuning 数据集准备 |
| 聚类 PHP 端展开 | 数据量大时（万级）会慢；可改 SQL 端 `JSON_TABLE`（MySQL 8）或 `json_each`（SQLite） |

## iteration-14 候选

| 方向 | 简述 |
|------|------|
| Bad Case CSV 导出 + 训练集生成器 | 闭环到 fine-tuning / prompt 优化的数据流 |
| pgvector / sqlite-vec 语义检索 | FTS5 中文召回问题（需 embedding API key） |
| 真实快递鸟接入 | 需用户提供 appKey |
| Webhook 队列化 + 重试 | iter-11 留的尾巴 |
| Sanctum token 过期 + 刷新 | 安全收尾 |
| AI confidence 低于阈值时自动标 bad case | iter-13 留的扩展（source=auto_lowconf） |
