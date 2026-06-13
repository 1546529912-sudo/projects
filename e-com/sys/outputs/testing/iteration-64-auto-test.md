# iteration-64-auto-test.md · 效率深化（6 项）

## 范围
- Q42-01 待办中心 24h 趋势 + 色阶：todosCounts 加 delta（pending_pay only）+ severity（critical/warn/ok/idle 按 count 阈值 100/20/0）
- Q42-02 高级搜索"我的视图"：新表 admin_views（admin_user_id, scope, name, filters_json）+ 3 endpoint（list/save/delete），同名覆盖
- Q42-03 dead_letter 自动 replay 策略：新表 stream_replay_policies（stream, max_retries, enabled）+ 2 endpoint（list/upsert），种 7 默认策略；worker 自动执行留 v2（需 supervisord 进程）
- Q43-02 二审备注：refund_orders + exchange_orders 加 second_review_note 列；RefundService/ExchangeService.approve 接 ?secondReviewNote 参；controller 接 second_review_note param
- Q43-04 editor OMS/WMS 隔离：审视已完成（iter-43 + iter-55 已收口；editor 在 iter-55 已从路由组移除）
- EFF-06 操作日志撤销：admin_audit_log 加 reversed_at/reversed_by；auditReverse endpoint 仅 super，白名单 order.force_cancel

## 文件
- 1 新 migration（OMS admin_views + stream_replay_policies + ALTER refund_orders/exchange_orders/admin_audit_log）
- 1 编辑 PHP（OMS Admin 加 7 新 endpoint：viewList/Save/Delete + streamPolicyList/Update + auditReverse + todosCounts 加 delta/severity）
- 1 编辑 PHP（OMS RefundService.approve 加 secondReviewNote 参）
- 1 编辑 PHP（OMS Refund controller 透传 note）
- 1 编辑 PHP（OMS ExchangeService.approve 加 secondReviewNote 参）
- 1 编辑 PHP（OMS Exchange controller 透传 note）
- 1 编辑 PHP（OMS route +7 新 endpoint）

## 收口
**Q42-01 / Q42-02 / Q42-03(表+endpoint) / Q43-02 / Q43-04 / EFF-06** ✅
**Q42-03 worker 自动 replay loop** 留 v2（需 supervisord）
