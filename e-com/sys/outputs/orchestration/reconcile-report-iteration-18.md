# reconcile-report-iteration-18.md · 运营增强对账

## 【当前焦点】
4 个 Wave 全做 + 测试拆分继续落地：
- B 导出 CSV / C 模糊搜索 / A Dashboard 报表 / D 批量操作
- iter-17 起测试硬约束延续：auto-test（curl）+ manual-test（UI）双产物

## 一、文件清单（17 文件，对照 [iteration-18-runbook §一](iteration-18-runbook.md#一文件清单共-17-文件41-wave)）

合计代码量：~900 行 PHP / ~600 行 Vue/TS。

## 二、关键设计决策

| 主题 | 决策 |
|---|---|
| CSV 格式 | UTF-8 BOM + fputcsv 流式输出，零新依赖 |
| 下载触发 | Vue fetch blob + `<a download>` 显式带 Authorization |
| 搜索 | SQL LIKE %%，多字段 OR group，不引入 ES |
| 图表库 | ECharts 5（裸调用，不用 vue-echarts 包装层）|
| 时间序列 | 后端补 0（前端不处理日期对齐）|
| 批量限制 | 单次 ≤ 50 + 每单独立事务 + failed[] 返回 |
| 多选守卫 | `:selectable` 函数 + canBatch computed 双层 |
| ECharts 内存 | onBeforeUnmount dispose + window resize 监听 |

## 三、本轮主动避坑

| 风险 | 规避 |
|---|---|
| Excel 中文乱码 | UTF-8 BOM \xEF\xBB\xBF |
| 大数据 OOM | limit 5000 + 留 M3+ 分批 |
| fetch 无 token | downloadFile helper 显式头 |
| 部分批量失败拖整组 | 每单独立 try/catch，failed[] 详情 |
| TP 路由顺序 | batch plain 路由放参数路由前 |
| ECharts 内存泄漏 | dispose + removeEventListener |
| 时间序列断档 | 后端 PHP 补 0 |
| 退款率分母 0 | `paid > 0 ? rate : 0` |
| 选错状态批量 | `:selectable` 禁 checkbox + canBatch 守卫 |

## 四、与历史 iter 对账

| iter | 关联 |
|---|---|
| iter-7 | Vue 后台读基础，iter-18 给所有 list 页加运营三件套 |
| iter-15 | audit log，iter-18 批量操作每单都写 |
| iter-17 | RBAC，iter-18 新接口全在 middleware 内 + 测试拆分流程延续 |
| **iter-18** | **运营增强四件套** |

## 五、剩余非阻塞（M3+）
详见 [runbook §七](iteration-18-runbook.md#七剩余非阻塞m3)：Q18-01 ~ Q18-07。

## 六、待用户运行验证

详见 [iteration-18-runbook §四](iteration-18-runbook.md#四待用户运行3-步)。
**iter-17 起测试拆分流程延续**：
- 自动测试我跑（curl）→ 写到 `outputs/testing/iteration-18-auto-test.md`
- 手动测试用户跑（Vue UI）→ 写到 `outputs/testing/iteration-18-manual-test.md`

## 七、对账结论

✅ **代码全量交付**：17 个文件，4 Wave 全部按 runbook 完成。
⏳ **测试执行**：主控将立即跑 auto-test（curl 测导出 / 搜索 / stats / 批量），完成后交付 manual-test 给用户。

## 八、对账时间
2026-05-29

## 九、本对账使用的 skill
- `karpathy-guidelines`（不引入 ES / PHPSpreadsheet / vue-echarts 包装层；零新依赖之外只加 echarts 这一个必需库）
- `.agents/testing/SKILL.md`（auto/manual 测试拆分硬约束）
