# reconcile-report-iteration-15.md · 退货凭证图片 + 后台 audit log

## 【当前焦点】
Wave A 退货凭证图片：用户上传 → OMS 落库 → 小程序 / Vue admin 双端展示。
Wave B 后台审计：6 处 admin 写操作自动落 audit_log + 后台查询页。

## 一、文件清单（15 文件，对照 [iteration-15-runbook §一](iteration-15-runbook.md#一文件清单共-15-文件abc-三-wave)）

合计代码量：~700 行 PHP / ~300 行 Vue / ~200 行小程序。

## 二、关键设计决策

| 主题 | 决策 |
|---|---|
| `/uploads/` 同路径多后端 | shop-backend 强制 `refund-evid/` 子目录，vite longest-prefix 分流 |
| 上传安全 | $_FILES + ext/size 双校验（复用 iter-10 fix-5 模式）|
| 5 张上限 | 客户端 + 服务端双兜底 |
| AuditService | static log()，零 DI 噪音；失败 try/catch 不阻塞 |
| audit before/after | 仅记关键字段（status / qty）的 JSON snapshot，非完整对象 |

## 三、本轮主动避坑

| 风险 | 规避 |
|---|---|
| /uploads 路径冲突 PIM↔shop-backend | refund-evid 子目录 + vite longest-prefix |
| TP file() 二次读取 bug | 沿用 iter-10 原生 $_FILES |
| 用户绕过前端上传超量 | RefundService::apply array_slice(_, 5) 兜底 |
| AuditService 写库失败拖垮主流程 | try/catch + error_log |
| Request::instance() 跨进程语境 | 仅 admin controller 调用，HTTP 语境保证 |
| 旧 refund_orders 行无 evidence_images | migration nullable，handler 解析时容错（典型 typeof===string→JSON.parse 失败 fallback 空数组）|
| audit log 体积膨胀 | 仅记关心字段；索引限制在 (operator, action, target) 三组合 |

## 四、与历史 iter 对账

| iter | 主题 | 关联 |
|---|---|---|
| iter-10 | PIM Upload + 后台 4 PIM CRUD 写 | iter-15 抄了 $_FILES 模式 + 子目录区分 |
| iter-14 | 退款主流程 + reserved 启用 | iter-15 补 evidence_images 字段；audit log 覆盖退款 3 个 admin 动作 |
| **iter-15** | **凭证图 + audit log** | **不引入新 stream / 新 consumer** |

## 五、剩余非阻塞（M3+）

| 编号 | 事项 |
|---|---|
| Q15-01 | 凭证图 OCR / AI 真伪识别 |
| Q15-02 | 大图 CDN / OSS 落盘 |
| Q15-03 | audit log 自动归档 + 冷存储 |
| Q15-04 | 操作日志页 action 列 i18n |
| Q15-05 | 凭证图客服批注 |

## 六、待用户运行验证

详见 [iteration-15-runbook §四-五](iteration-15-runbook.md#四待用户运行4-步)：4 步命令 + 5 步浏览器/小程序清单。

## 七、对账结论

✅ **代码全量交付**：15 个文件，A+B+C 三 Wave 全部按 runbook 完成。
⏳ **运行时验证**：等待用户执行 1 次 migrate + 2 后端 restart + vite 重启 + 小程序重编译 + 5 步清单。
🔄 **预期返工**：可能 1-2 项小修；本轮已主动规避路径冲突 / 上传安全 / 审计阻塞 / migrate 顺序 4 类历史坑。

## 八、对账时间
2026-05-28

## 九、本对账使用的 skill
- `karpathy-guidelines`（不引入 OCR / 不引入 OSS / 不引入 i18n / 不引入 RBAC，按需最小补充）
