# Reconcile Report · Iteration 14（Bad Case CSV / JSONL 导出）

> 完成时间：2026-05-22

## 【当前焦点】

- 范围：iter-13 收的 bad case → 让运营拉 CSV 看 / 让 ML 拉 JSONL 起草训练集
- 结论：AdminAiFeedbackController + `exportCsv` + `exportJsonl` 两端点；streamDownload 流式；前端 fetch + blob 触发下载
- 测试：PHPUnit **129/129**（+4）· pytest 22/22 · Vitest 18/18 全 PASS

## 设计取舍

| 选项 | 选择 | 理由 |
|------|------|------|
| Stream vs Buffered | **`streamDownload` + `chunk(200)`** | bad case 量大也不爆内存；行级写入即送 |
| CSV 编码 | **UTF-8 + BOM** | Excel 直接双击不乱码（运营第一时间会试） |
| Tag 在 CSV 怎么放 | **分号分隔单列** | 不展开多列；运营 Excel 二级分列方便 |
| JSONL 上下文范围 | **仅上一条 user + 当前 ai 消息** | 简单清晰；多轮上下文留 v2，先满足"哪个问题哪个答错" |
| `correct_answer` 字段 | **始终 null** | 当前没人工修复字段；让 ML 在外部数据集里补全。诚实标注"这是起草" |
| 前端如何下载 | **fetch + blob** | 我们用 Bearer token；`<a download>` 不带 header 走不通；blob 方案最 portable |
| 路由路径 | **`.csv` / `.jsonl` 后缀** | 直观，URL 看一眼就知道是导出 |

## 后端产物

| 文件 | 说明 |
|------|------|
| `app/Http/Controllers/Api/AdminAiFeedbackController.php` | +`exportCsv` +`exportJsonl` +`turnFor` 辅助（找 ai 消息前的最后一条 user 消息） |
| `routes/api.php` | +`GET /admin/ai/feedbacks/export.csv` +`GET /admin/ai/feedbacks/export.jsonl` |
| `tests/Feature/AiFeedbackExportTest.php` | 4 测试：CSV 含 BOM+表头+tags 分号；JSONL 每行有效；非 admin 403；labeled=0 过滤 |

## 前端产物

| 文件 | 说明 |
|------|------|
| `src/api/admin-bad-case.ts` | +`adminExportBadCases(format, params)` fetch + blob + 自动从 `Content-Disposition` 取 filename |
| `src/views/admin/BadCasesPage.vue` | header 加 "📥 导出 CSV" / "📥 导出 JSONL" 按钮；导出时 disabled |

## 端到端实测

```bash
$ curl -H "Authorization: Bearer <admin>" \
       "http://localhost:8000/api/v1/admin/ai/feedbacks/export.csv?rating=bad&labeled=1"
﻿ feedback_id,conversation_id,message_id,created_at,rating,source,reason,tags,user_question,ai_reply,labeled,labeled_at
1,1,2,"2026-05-22 13:00:54",bad,manual,"demo:Q&A 知识缺失",知识缺失;答非所问,"碳纤维板 100kg 多少钱","已为您匹配：T700 标准型碳纤维板 3MM..."  ,1,"2026-05-22 13:00:54"

$ curl ... .jsonl?rating=bad&labeled=1
{"feedback_id":1,"rating":"bad","source":"manual","tags":["知识缺失","答非所问"],"reason":"demo:Q&A 知识缺失",
 "messages":[{"role":"user","content":"碳纤维板 100kg 多少钱"},{"role":"assistant","content":"已为您匹配..."}],
 "correct_answer":null}
```

## 关键测试 case

| 测试 | 验证 |
|------|------|
| `test_csv_export_contains_header_and_row` | BOM `\xEF\xBB\xBF` 起首 + 列头 + tags `知识缺失;答非所问` |
| `test_jsonl_export_valid_per_line` | 每行可 `json_decode`，messages 角色顺序 user→assistant 正确 |
| `test_non_admin_blocked_from_export` | 普通用户两个端点都 403（iter-12 中间件覆盖到 GET） |
| `test_filter_labeled_zero_excludes_labeled_rows` | labeled=0 + 一标一未标 → 仅返回未标的那一条 |

## HARNESS 5 项硬约束

| # | 状态 |
|---|------|
| 产物清单 | ✅ 3 后端 + 2 前端 |
| 文件 ls | ✅ |
| 自动化测试 | ✅ PHPUnit 129/129（+4）· pytest 22/22 · Vitest 18/18 |
| 手动验收 | ✅ 真实 curl 两个端点输出实测；UI 按钮 + 浏览器下载链路 |
| 对账报告 | ✅ |

## 用户手动验收

1. admin 登录 → /admin/bad-cases
2. 顶部 "📥 导出 CSV" → 浏览器下载 `ai-feedbacks-YYYYMMDD-HHMMSS.csv`
3. Excel 打开 → 中文不乱码，tags 在 H 列分号分隔
4. "📥 导出 JSONL" → `.jsonl` 文件每行一个 JSON 对象，含 `messages` 数组
5. tab 切到"未标注" → 再点导出，得到的文件就只含未标注的

## 风险与已知问题

| 项 | 说明 |
|----|------|
| 上下文只到 1 轮 | JSONL 只含上一条 user + 当前 ai，多轮场景丢失上下文；可扩展到"取 ai 消息之前最近 N=3 条" |
| 无 system prompt | JSONL `messages` 没有 system role；导出后由 ML 工程师手动包一层 |
| `correct_answer` 永远 null | 当前 schema 没人工修复字段；后续可加 `ai_feedbacks.correct_answer` 列，让运营直接在后台填 |
| 大文件 | streamDownload + chunk(200) 可以撑很大，但前端 fetch + blob 全量加载内存；万级数据要走 `<a href>` + 临时 token 方案 |
| 文件名是从 Content-Disposition 解析 | 跨浏览器格式略有差异；后备用 `ai-feedbacks.csv` 通用名 |

## iteration-15 候选

| 方向 | 简述 |
|------|------|
| `correct_answer` 字段 + 后台填写 | 让标注变成"修复"闭环（运营在标 tag 时同时写正确回复），直接产出训练样本 |
| auto_lowconf 自动入库 | iter-13 留的扩展点：confidence < 阈值自动 source=auto_lowconf |
| pgvector / sqlite-vec 语义检索 | 需 embedding API key |
| Webhook 队列化 + 重试 | iter-11 尾巴 |
| 真实快递鸟接入 | 需 appKey |
| Sanctum token 过期 + 刷新 | 安全收尾 |
