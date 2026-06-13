# Reconcile Report · Iteration 16（auto_lowconf 自动入库）

> 完成时间：2026-05-23

## 【当前焦点】

- 范围：iter-13 留的口子兑现 —— AI 自评 confidence 低于阈值时自动入 bad case（source=auto_lowconf）
- 结论：AiController.sendMessage 在 transfer 检测之后追加一段；阈值走 `config('services.ai.lowconf_threshold')` 默认 0.6；与 auto_transfer 互斥避免重复
- 测试：PHPUnit **137/137**（+4）· pytest 22/22 · Vitest 18/18 全 PASS

## 设计取舍

| 选项 | 选择 | 理由 |
|------|------|------|
| 阈值常量 vs 可配置 | **`config('services.ai.lowconf_threshold')`** | 不同业务线/不同时期想调；可 env 覆盖 |
| `threshold=0` 行为 | **禁用** | 给"我不想要这个特性"留逃生通道，不用代码改 |
| 与 transfer 冲突 | **transfer 优先，跳过 lowconf** | 转人工已经是更强的 bad 信号；避免双条噪音 |
| confidence null 行为 | **不触发** | mock LLM 经常不返 confidence；不能把空当低 |
| reason 文案 | **`"AI 自评 confidence=0.30 < 阈值 0.60"`** | 后台一眼看出来由哪里来的 |

## 后端产物

| 文件 | 说明 |
|------|------|
| `config/services.php` | + `ai.url/timeout/lowconf_threshold` + `webhook.stock_alert_url`（之前散在 env，统一管理） |
| `app/Http/Controllers/Api/AiController.php` | sendMessage 在 transfer 处理后追加 lowconf 块；`$transferred` 局部变量让两条 if 互斥 |
| `tests/Feature/AiAutoLowConfTest.php` | 4 测试：低→触发 / 高→不触发 / threshold=0 禁用 / transfer 优先 |

## 前端产物

| 文件 | 说明 |
|------|------|
| `src/views/admin/BadCasesPage.vue` | +`.src-auto_lowconf { background:#e0f2fe; color:#075985 }` 蓝色徽章区分 |

注：BadCasesPage 已支持 source filter（iter-13 既建），无需额外路由/页面。

## 端到端实测

```bash
$ php artisan tinker --execute='...'
config threshold = 0.6
fb_id=2 source=auto_lowconf reason=AI 自评 confidence=0.25 < 阈值 0.60
```

## 关键测试 case

| 测试 | 验证 |
|------|------|
| `test_low_confidence_triggers_auto_lowconf_feedback` | confidence=0.3, threshold=0.6 → 入一条 source=auto_lowconf，reason 含阈值 |
| `test_high_confidence_does_not_trigger` | confidence=0.9 → 不入 |
| `test_threshold_zero_disables_feature` | threshold=0 → 即使 conf=0.05 也不入 |
| `test_transfer_takes_priority_no_double_feedback` | transfer=true + conf=0.3 → 只入 1 条 source=auto_transfer |

## HARNESS 5 项硬约束

| # | 状态 |
|---|------|
| 产物清单 | ✅ 3 后端 + 1 前端 |
| 文件 ls | ✅ |
| 自动化测试 | ✅ PHPUnit 137/137（+4）· pytest 22/22 · Vitest 18/18 |
| 手动验收 | ✅ tinker 实测：threshold=0.6 + conf=0.25 → fb 入库 source=auto_lowconf |
| 对账报告 | ✅ |

## 用户手动验收

http://localhost:5173/

1. 默认配置阈值 0.6
2. 若想关掉自动入库：`.env` 加 `AI_LOWCONF_THRESHOLD=0` 重启
3. 若想更宽松：`AI_LOWCONF_THRESHOLD=0.4`
4. 用 AI 抽屉对话；当真实 LLM 返回 confidence<0.6 时，/admin/bad-cases 自动多一条蓝色徽章的 auto_lowconf 条目
5. mock LLM 模式下不返 confidence，所以自动入库不会触发 —— 这是按设计的

## 风险与已知问题

| 项 | 说明 |
|----|------|
| confidence 由 FastAPI 决定 | DeepSeek/通义/mock 返不返 confidence 不可控；需 ai-service 一侧标准化输出 |
| 阈值未分意图 | 当前一刀切；presale / quotation / aftersale 应有不同阈值，留 v2 |
| 噪音风险 | 阈值定太高（如 0.9）会把大量"还行"的回复也标 bad；建议从 0.5-0.6 开始观察 |
| 与 manual feedback 不去重 | 用户后来主动 thumbs down 同一条会再入一条 manual；语义上"两路证据"合理，但可加 unique(message_id, source) 防漏 |

## iteration-17 候选

| 方向 | 简述 |
|------|------|
| Webhook 队列化 + 重试 ⭐ | iter-11 尾巴 |
| Sanctum token 过期 + 刷新 | 安全收尾 |
| pgvector / sqlite-vec 语义检索 | 需 embedding API key |
| 真实快递鸟接入 | 需 appKey |
| label 协作冲突保护（updated_at 乐观锁） | iter-15 尾巴 |
| ai-service 一侧 confidence 标准化 | iter-16 留的下游 |
