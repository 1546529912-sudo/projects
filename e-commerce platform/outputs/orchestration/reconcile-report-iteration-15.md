# Reconcile Report · Iteration 15（correct_answer 字段 · 标注→修复→训练样本闭环）

> 完成时间：2026-05-23

## 【当前焦点】

- 范围：把 iter-13 的"标注" 升级成 "标注 + 修复"。运营在写标签时直接填正确回复，JSONL 导出立刻是可训练样本（assistant 内容 = correct_answer）
- 结论：新增 `ai_feedbacks.correct_answer` 列；label endpoint 接受 `correct_answer`；JSONL 输出 `is_training_ready` 标志位 + `bad_reply` 保留位
- 测试：PHPUnit **133/133**（+4）· pytest 22/22 · Vitest 18/18 全 PASS

## 设计取舍

| 选项 | 选择 | 理由 |
|------|------|------|
| 单独表 vs 列 | **加列** | 一对一关系，加列最简；schema 影响小 |
| label 接口拆分还是融合 | **融合**（label 同时收 tags + correct_answer） | 运营一次操作完成，UX 顺手 |
| correct_answer 写入时机 | **可选**（标 tag 必填，正确答案选填） | 标注门槛低；想随手标也能；想认真修也能 |
| JSONL 没填正确答案时 | **assistant 回的是 bad** | 让 ML 看到原始问题；通过 `is_training_ready` 区分 |
| 保留 bad_reply 字段 | **always** | 方便 diff 训练前后；审计也用得着 |

## 后端产物

| 文件 | 说明 |
|------|------|
| `database/migrations/2026_05_22_000016_add_correct_answer_to_ai_feedbacks.php` | +`correct_answer` text nullable，after('reason') |
| `app/Models/AiFeedback.php` | fillable + `correct_answer` |
| `app/Http/Controllers/Api/AdminAiFeedbackController.php` | label 校验 `correct_answer:nullable|string|max:5000` + 写入；exportJsonl 使用 correct 优先 / 否则 bad，新增 `bad_reply` / `is_training_ready` 字段；exportCsv 加 `correct_answer` 列；stats 加 `training_ready` 计数 |
| `tests/Feature/AiFeedbackTest.php` | +1 label 持久化 +1 stats 训练就绪计数 |
| `tests/Feature/AiFeedbackExportTest.php` | +1 JSONL 用 correct 作 assistant +1 CSV 含 correct_answer 列 |

## 前端产物

| 文件 | 说明 |
|------|------|
| `src/api/admin-bad-case.ts` | AiFeedback / FeedbackStats 类型加字段；adminLabelBadCase 加可选 correctAnswer 参数 |
| `src/views/admin/BadCasesPage.vue` | label modal 加宽到 640px + 顶部显示"AI 当时的错误回复"（红底）+ "正确答案"textarea；列表"已标注"行加 "✓ 已修复 / + 写正确答案" 二次入口 |
| `src/views/admin/DashboardPage.vue` | bad case 卡片 hint 加 "训练就绪 N" |

## 端到端实测

```bash
# 1. 给已有的 fb 写 correct_answer
$ tinker → AiFeedback::first()->update(['correct_answer' => 'demo: ...'])

# 2. stats 立刻反映
$ curl /admin/ai/feedbacks/stats
{"total_bad":1, "training_ready":1}

# 3. JSONL 输出（关键）：assistant = correct，bad_reply 保留
$ curl /admin/ai/feedbacks/export.jsonl?rating=bad&labeled=1
{
  "feedback_id":1,
  "messages":[
    {"role":"user","content":"碳纤维板 100kg 多少钱"},
    {"role":"assistant","content":"demo: 一吨碳纤维板 T700 标准型 ¥1180/kg，建议下单数量 ≥1000kg 享阶梯价"}  ← correct_answer
  ],
  "bad_reply":"已为您匹配：T700 标准型碳纤维板 3MM，单价 ¥1280.00...",   ← 原 AI 回复保留
  "correct_answer":"demo: 一吨碳纤维板...",
  "is_training_ready":true                                              ← 标志位
}
```

## 关键测试 case

| 测试 | 验证 |
|------|------|
| `AiFeedbackTest.test_admin_label_persists_correct_answer` | label endpoint 传 correct_answer → 入库 |
| `AiFeedbackTest.test_admin_label_marks_labeled_and_writes_tags` | **现有测试增量断言** 未传 correct_answer 时保持 null |
| `AiFeedbackTest.test_stats_counts_training_ready_when_correct_answer_set` | 2 条 bad，1 条有 correct_answer → training_ready=1 |
| `AiFeedbackExportTest.test_jsonl_uses_correct_answer_when_present` | assistant 内容切换为 correct，is_training_ready=true，bad_reply 保留 |
| `AiFeedbackExportTest.test_jsonl_export_valid_per_line` | **现有测试增量断言** bad_reply 存在 + is_training_ready=false |
| `AiFeedbackExportTest.test_csv_includes_correct_answer_column` | CSV 表头 + 行含 correct_answer |

## HARNESS 5 项硬约束

| # | 状态 |
|---|------|
| 产物清单 | ✅ 5 后端 + 3 前端 |
| 文件 ls | ✅ |
| 自动化测试 | ✅ PHPUnit 133/133（+4）· pytest 22/22 · Vitest 18/18 |
| 手动验收 | ✅ curl stats 和 JSONL 真实输出实测，is_training_ready 切换正确 |
| 对账报告 | ✅ |

## 用户手动验收

http://localhost:5173/

1. admin（13800000001/admin123）→ /admin/bad-cases
2. 头部能看到 "训练集就绪 N" 绿色徽章
3. 任一未标注 bad case → 点"标注" → modal 顶部红底展示 AI 错误回复；选 tag；下面填正确答案
4. 保存 → 列表里这条变成"✓ 已修复"；可再点重新编辑
5. 点 "📥 导出 JSONL" → 文件里这条 `is_training_ready:true`，assistant 内容就是你刚填的
6. Dashboard 上 bad case 卡片显示 "训练就绪 N"

## 风险与已知问题

| 项 | 说明 |
|----|------|
| 多用户协作冲突 | 当前 label 覆盖式写 correct_answer；两个运营同时改同一条会丢更新；可加 updated_at 乐观锁 |
| 缺 system prompt | JSONL 仍无 system role；交给 ML 在外部包一层 |
| correct_answer 校验弱 | 仅长度限制，没有质量校验；后续可加"AI 生成校验"建议（自动 sanity check） |
| 多轮上下文 | 仍只取上一条 user message；多轮场景丢失上下文（同 iter-14 限制） |

## iteration-16 候选

| 方向 | 简述 |
|------|------|
| auto_lowconf 自动入库 ⭐ | iter-13 留的口子；confidence < 阈值自动 source=auto_lowconf |
| Webhook 队列化 + 重试 | iter-11 尾巴 |
| Sanctum token 过期 + 刷新 | 安全收尾 |
| pgvector / sqlite-vec 语义检索 | 需 embedding API key |
| 真实快递鸟接入 | 需 appKey |
| label 乐观锁 / 协作冲突保护 | iter-15 留的小尾巴 |
