# reconcile-report-iteration-16.md · 售后超时关闭 + 最小 RBAC

## 【当前焦点】
Wave A：return_refund 单 approved 超 7 天自动 closed_overtime + 释放 reserved。
Wave B：admin 真实登录 + 3 角色 + Vue 菜单显隐 + OMS endpoint 加 middleware。

## 一、文件清单（14 文件，对照 [iteration-16-runbook §一](iteration-16-runbook.md#一文件清单共-14-文件3-wave)）

合计代码量：~600 行 PHP + ~150 行 Vue/TS。

## 二、关键设计决策

| 主题 | 决策 |
|---|---|
| JWT 库 | 手写 HS256（30 行），零新增 composer 依赖 |
| 超时阈值 | 硬编码 7 天 + 每小时扫一次（240 次后正常退出）|
| 关闭后库存 | unreserve（货物未到仓，不能 available）|
| RBAC 落点 | OMS middleware + Vue UI 双层；PIM/WMS endpoint 暂不加 |
| 用户管理 | dev 阶段直接改 DB；M3 加 UI |
| 默认账号 | 3 个 seed（admin/wh/sales），随 migration 自动写入 |

## 三、本轮主动避坑

| 风险 | 规避 |
|---|---|
| 旧 mock token 进 middleware 报错 | 严格 3 段校验 + 签名 → 401，前端 axios 自动跳 /login |
| 7 天阈值无法实测 | runbook 给出"改 DB approved_at + 前台单次运行"验证方法 |
| PHP 长跑内存泄漏 | 240 次（~10 天）后 exit 0，supervisord 重拉 |
| JWT secret 暴露 | env('ADMIN_JWT_SECRET') fallback 'dev-insecure-secret'，生产需设置 |
| 多 backend enforcement 不一致 | 文档明确 MVP 范围，M3 补 PIM/WMS |
| 菜单刷新后角色丢失 | role/name 持久化 localStorage |
| 关闭超时单状态机冲突 | mustFind + 状态机早期返回（终态跳过）|
| 关闭事务回滚 | Db::startTrans + try/catch + rollback |

## 四、状态机扩展（iter-16）

```
pending_approve → approved → received_back → refunded
                ↘ rejected            ↗
                ↘ closed_overtime ✨ (新增，return_refund 超时)
```

## 五、与历史 iter 对账

| iter | 主题 | 关联 |
|---|---|---|
| iter-9 | supervisord consumer 模式 | iter-16 refund-close-overdue 复用 |
| iter-14 | 退款 reserved | iter-16 unreserve 收尾 |
| iter-15 | audit log | iter-16 暂未给 admin login 加（Q16-03 M3）|
| **iter-16** | **超时 + RBAC** | 不引入新事件流 |

## 六、剩余非阻塞（M3+）

| 编号 | 事项 |
|---|---|
| Q16-01 | PIM/WMS endpoint 级 admin enforcement |
| Q16-02 | admin 用户管理 UI |
| Q16-03 | 登录审计 |
| Q16-04 | 退款超时阈值配置化 |
| Q16-05 | 关闭超时单后通知 |

## 七、待用户运行验证

详见 [iteration-16-runbook §五-六](iteration-16-runbook.md#五待用户运行4-步)：4 步命令 + 7 步浏览器/数据库清单。

## 八、对账结论

✅ **代码全量交付**：14 个文件，3 Wave 全部按 runbook 完成。
⏳ **运行时验证**：等待用户执行 1 migrate + 1 后端 restart + Vue 重登 + 7 步清单。
🔄 **预期返工**：可能 1-2 项小修；本轮已主动规避旧 token 401 / 长跑内存 / JWT 依赖 / 阈值无法测 4 类历史坑。

## 九、对账时间
2026-05-28

## 十、本对账使用的 skill
- `karpathy-guidelines`（不引入 JWT 库 / 不引入用户管理 UI / 不引入跨服务 enforcement，按需最小补充）
