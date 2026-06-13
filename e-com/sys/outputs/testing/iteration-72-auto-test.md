# iteration-72-auto-test.md · 中优 4 项

## 范围
- Q42-03 worker：新 command `dead-letter:auto-replay`（30s 间隔，~8h 退由 supervisord 重拉）+ supervisord.conf 加 `[program:dead-letter-auto-replay]` + console.php 注册；按 stream_replay_policies.max_retries 个性化策略；replay 后 dead_letter.error 追"auto-replayed at YYYY-mm-dd HH:ii:ss"防重；retry_count++
- Q43-04 editor 完整隔离：路由层 iter-55 已收（再 grep 0 命中）；service 层 OMS+WMS StoreContextService 加 editor 返空数组 `[]` — 即"已认证但无可见数据"
- Q35-01/Q39-02 店铺装修：新 store_pages 表（unique store+type，version 自增）+ StorePageService（get/save/publish/publicRead）+ 4 endpoint（admin: get/save/publish + public read）+ block 类型白名单（banner/spu_list/text/grid）+ spu_list 公开读跨库回填 SPU 信息
- Q26-02 结算单退款审批流：settlements 加 approval_status/approved_by/approved_at/rejection_reason；新 endpoint `POST /admin/settlement/<id>/approve` 和 `/reject`（super_admin）+ 状态机限 pending → approved/rejected；audit 记录

## 文件
- 1 新 migration（OMS store_pages + settlements +4 列）
- 1 新 PHP command（DeadLetterAutoReplay）
- 1 新 PHP service（StorePageService）
- 1 编辑 console.php（注册 dead-letter:auto-replay）
- 1 编辑 supervisor/consumer.conf（+1 program block）
- 1 编辑 PHP（OMS StoreContextService 加 editor=[]）
- 1 编辑 PHP（WMS StoreContextService 加 editor=[]）
- 1 编辑 PHP（OMS Admin 加 storePage* 3 + settlementApprove + settlementReject）
- 1 编辑 PHP（OMS Store controller 加 publicPage）
- 1 编辑 PHP（OMS route +6 endpoint）

## 收口
**Q42-03 / Q43-04 / Q35-01 / Q39-02 / Q26-02** ✅
