# iteration-60-auto-test.md · 内容运营深化（5 项）

## 范围
- Q40-02 Banner 按店铺：publicListBanners 接受 store_id 参数（null=仅平台 / >0=该店+平台）
- Q40-03 推荐位个性化：publicListFeatured 接受 user_id，90 天订单<3 单视为非 VIP，按 spu_id desc 重排（新货优先）
- Q41-02 营销日历真甘特图：Vue MarketingCalendar 加 view 切换（table / gantt），dayTicks 自适应粒度（≤31d=1d / ≤90d=7d / 其他=30d）
- Q41-03 专题 link 集成 Banner：LINK_TYPES 加 'topic'，publicListBanners 回填 link_topic_code（跨表查 marketing_topics.code）
- Q41-04 营销日历冲突预警：calendar() 加 detectBannerConflicts（同 position + 时间重叠 banner 对）+ Vue 顶部 el-alert + 行高亮

## 文件
- 1 编辑 PHP（OMS BannerService 加 LINK_TYPES topic + fetchTopicCodes + publicListFeatured userId RFM 重排）
- 1 编辑 PHP（OMS Banner controller publicListBanner 接 store_id + publicListFeatured 接 user_id）
- 1 编辑 PHP（OMS MarketingTopicService.calendar 加 conflicts + detectBannerConflicts + extractPosition）
- 1 编辑 Vue（shop-admin MarketingCalendar.vue 加 view radio + gantt 视图 + conflict alert + 行高亮）

## 0 新表 0 新接口（全部复用 iter-40/41/46/51 基建）

## 收口
**Q40-02 / Q40-03 / Q41-02 / Q41-03 / Q41-04** 全部 ✅
