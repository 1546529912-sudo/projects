# iteration-60-manual-test.md · 5 项 UI

1. 后台进"营销日历" → 切换"📊 甘特图"视图，确认横向时间轴 + 各 banner/topic/coupon 条
2. 故意建 2 个 home 位、相同时间段 banner，刷新日历，验证顶部出现 ⚠️ 冲突告警 + 行红底
3. 后台 Banner 编辑 → link_type 下拉新增"topic"选项，选 topic 保存
4. 小程序首页（带 user_id session）拉 featured，对比 90 天≥3 单老用户 vs 新用户的 SPU 排序是否不同
5. 小程序首页 banner 调 `/banner/list?position=home&store_id=2` 验证返回包含 store_id=2 的 banner（而不调 store_id 仅返平台）
