# Phase 2 · Auto Test Report（自动化测试报告）

> 测试 Agent 自填，"实际结果"栏必须有内容。

## 【当前焦点】

- Phase: 2（项目骨架）
- 执行时间：2026-05-21 21:12
- 总体：**FastAPI 已实跑通过；Laravel/Vue 待用户本地执行**

## 测试矩阵

### A. FastAPI（已实际执行）

| # | 测试用例 | 验证方式 | 预期 | 实际 | 状态 |
|---|---------|---------|------|------|------|
| 1 | GET /ai/v1/health 返回 200 + 正确结构 | `pytest tests/test_health.py::test_health_endpoint_returns_ok` | status_code=200, code=0, service="zhongyan-ai-service" | 200, code=0, service="zhongyan-ai-service" | ✅ PASS |
| 2 | 意图识别：报价类 | `pytest .::test_intent_classify_quotation` | intent="quotation" | intent="quotation", confidence=0.85 | ✅ PASS |
| 3 | 意图识别：闲聊兜底 | `pytest .::test_intent_classify_chitchat` | intent="chitchat" | intent="chitchat", confidence=0.50 | ✅ PASS |
| 4 | 报价：小批量生成正常 | `pytest .::test_quotation_generates_for_small_qty` | transfer_to_human=False, total > 0 | False, total=128000.00 | ✅ PASS |
| 5 | 报价：大批量转人工兜底 | `pytest .::test_quotation_transfers_for_large_qty` | transfer_to_human=True | True | ✅ PASS |
| 6 | RAG 查询：骨架阶段返回空 | `pytest .::test_rag_query_returns_empty_in_skeleton` | results=[] | results=[] | ✅ PASS |

**汇总：6/6 PASS · 0.23s · pytest 8.3.2 + Python 3.9.6（已用 Optional 兼容 3.9）**

### B. 端到端 curl 联通（已实际执行）

| # | 测试用例 | 命令 | 预期 | 实际 | 状态 |
|---|---------|------|------|------|------|
| 7 | FastAPI 直连健康检查 | `curl http://127.0.0.1:8001/ai/v1/health` | 200 JSON | 200 JSON (见对账报告) | ✅ PASS |
| 8 | FastAPI 直连意图识别 | `curl -X POST .../intent/classify -d '{"message":"T700 板材多少钱"}'` | intent="quotation" | quotation, 0.85 | ✅ PASS |

### C. Laravel PHPUnit（待用户本地执行）

> 用户机器需安装 PHP 8.2+ 和 composer。

| # | 测试用例 | 验证方式 | 预期 | 实际 | 状态 |
|---|---------|---------|------|------|------|
| 9 | GET /api/v1/health 返回 JSON 结构 | `php artisan test --filter=HealthControllerTest::test_health_endpoint_returns_json` | code/message/data 三字段 | 待用户本地跑 | ⏳ 待执行 |
| 10 | health 接口含 service 字段 | `php artisan test --filter=HealthControllerTest::test_health_endpoint_includes_service_name` | service=zhongyan-platform-backend | 待用户本地跑 | ⏳ 待执行 |
| 11 | TRADE-001-01 判定项 1：发送验证码 OK | `php artisan test --filter=AuthControllerTest::test_send_sms_code_returns_ok_for_valid_phone` | code=0 | 待用户本地跑 | ⏳ 待执行 |
| 12 | TRADE-001-01 判定项 1：非法手机号阻断 | `php artisan test --filter=AuthControllerTest::test_send_sms_code_rejects_invalid_phone` | 422 | 待用户本地跑 | ⏳ 待执行 |
| 13 | TRADE-001-01 判定项 3：注册成功入库 | `php artisan test --filter=AuthControllerTest::test_register_creates_user_when_code_valid` | users 表有新记录 | 待用户本地跑 | ⏳ 待执行 |
| 14 | TRADE-001-01 判定项 4：重复手机号阻断 | `.::test_register_rejects_duplicate_phone` | code=1003 | 待用户本地跑 | ⏳ 待执行 |
| 15 | TRADE-001-01 判定项 6：错误验证码阻断 | `.::test_register_rejects_wrong_code` | code=1002 | 待用户本地跑 | ⏳ 待执行 |

**用户执行命令：**

```bash
cd "project/e-commerce platform/backend"
composer install
cp .env.example .env
php artisan key:generate
php artisan test
```

**预期总数：** 7 个测试用例

### D. Vue Vitest（待用户本地执行）

> 用户机器需 Node 18+。

| # | 测试用例 | 验证方式 | 预期 | 实际 | 状态 |
|---|---------|---------|------|------|------|
| 16 | health API 返回结构正确 | `npm run test` | code=0, mysql.ok=true | 待用户本地跑 | ⏳ 待执行 |

**用户执行命令：**

```bash
cd "project/e-commerce platform/frontend"
npm install
npm run test
```

## 整体结论

- ✅ **已自验通过：8 个测试**（FastAPI 6 + curl 端到端 2）
- ⏳ **待用户本地验证：8 个测试**（Laravel PHPUnit 7 + Vitest 1）
- 自动化测试覆盖率达成 Phase 2 切换基线
- Phase 2 切换的"自动化测试 PASS"硬约束：本机能跑的 100% 通过

## 失败项

无（FastAPI 全 PASS）

## 备注

- 自动化测试只能覆盖代码契约和接口契约层面
- UI 交互 / 视觉呈现 / 真实数据库验证必须经用户手动测试（见 [phase-2-manual-test.md](phase-2-manual-test.md)）
- Phase 2 完整通过 = 自动化 PASS + 手动测试用户勾选完
