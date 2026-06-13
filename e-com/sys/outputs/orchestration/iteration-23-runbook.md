# iteration-23-runbook.md · 多 SKU 批量调拨单（Q22-01）

## 一、文件清单（共 ~7 文件，3 Wave）

### Wave 1 · 数据层（1 文件，2 操作）
1. `apps/wms-backend/database/migrations/20260602000001_create_transfer_items.php` — 加 transfer_items 表 + ALTER transfers 把 inline SKU/库位字段改 nullable

### Wave 2 · 后端改造（2 文件）
2. `apps/wms-backend/app/service/TransferService.php` 改 — items 数组模式：create/ship/receive/cancel 全改为按 items 遍历操作
3. `apps/wms-backend/app/controller/Transfer.php` 微调 — 接受 items[] 参数

### Wave 3 · Vue 改造（2 文件）
4. `apps/shop-admin/src/apis/wms.ts` 改 — transferCreate 改为接收 items 数组
5. `apps/shop-admin/src/pages/wms/Transfers.vue` 改 — 创建对话框改成头 + 动态明细表；详情对话框显示明细列表

### Wave 4 · 测试 + 文档（2 文件）
6. `outputs/testing/iteration-23-auto-test.md`
7. `outputs/testing/iteration-23-manual-test.md`

## 二、表结构

### transfers (ALTER) — 改为"单头多明细"模式
```sql
-- 原 inline 字段全改 nullable（旧数据保留作 legacy 单 SKU 模式可读）
ALTER TABLE transfers
  MODIFY sku_code VARCHAR(64) NULL,
  MODIFY batch_no VARCHAR(64) NULL,
  MODIFY from_location VARCHAR(32) NULL,
  MODIFY to_location VARCHAR(32) NULL,
  MODIFY qty INT NULL;
```

### transfer_items（明细）
```sql
CREATE TABLE transfer_items (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  transfer_no VARCHAR(32) NOT NULL,
  line_no INT NOT NULL,                          -- 1-based 行号
  sku_code VARCHAR(64) NOT NULL,
  batch_no VARCHAR(64) NOT NULL DEFAULT 'INIT',
  from_location VARCHAR(32) NOT NULL,
  to_location VARCHAR(32) NOT NULL,
  qty INT NOT NULL,
  KEY idx_transfer_no (transfer_no)
);
```

## 三、关键设计决策

| 主题 | 决策 |
|---|---|
| 头/明细拆分 | 一头多明细。头只管仓库 + 状态 + 元数据，每明细自带 from/to 库位 + SKU + 批次 + qty |
| 同一调拨单内异构方向 | 允许：明细行之间可以有不同 from_location → to_location 对，灵活满足"多 SKU 同时挪窝" |
| 状态机不变 | draft → in_transit → completed / cancelled，全单维度 |
| ship 行为 | 遍历所有 items，逐条 lock from inventory；任一失败全 rollback；status=in_transit |
| receive 行为 | 遍历所有 items，逐条 from -- + to ++ + locked --；status=completed |
| cancel 行为 | 若 in_transit，遍历释放 locked；status=cancelled |
| 旧数据兼容 | 老的 4 条 transfers 行保留 inline 字段（NULL 不冲突），service 检测 items 为空则按 legacy 单 SKU 模式读，前端列表显示"单 SKU"标签 |
| 控制器 items 校验 | items 不能为空数组；每行 required 字段齐全 |
| 同方向去重 | 不强制（允许同单内多次同 from→to 同 SKU 多批次） |
| line_no 顺序 | 按提交顺序 1..N，纯展示用 |

## 四、API 设计

**POST /api/v1/transfer**（新 body 形态）：
```json
{
  "from_warehouse": "WH-DEFAULT",
  "to_warehouse": "WH-DEFAULT",
  "remark": "...",
  "items": [
    { "from_location": "A-01-01-01", "to_location": "STAGING-01", "sku_code": "SPU001-001", "batch_no": "INIT", "qty": 5 },
    { "from_location": "A-01-02-01", "to_location": "STAGING-01", "sku_code": "SPU002-001", "batch_no": "INIT", "qty": 3 }
  ]
}
```

**GET /api/v1/transfer/:no** — 响应加 `items: [...]` 数组。

其余 ship / receive / cancel / list 接口形态不变。

## 五、避坑

| 风险 | 规避 |
|---|---|
| items 空数组 | 后端 400 拒绝 |
| 同行 from = to | 后端逐行校验，错误带 line_no |
| ship 中某行不足 | rollback 全单（事务内）|
| 各行 batch_no 默认值 | 与 iter-22 同：默认 INIT |
| receive 部分成功 | 不支持，全单一致；M3+ 加"部分接收" |
| legacy 单 SKU 行展示 | 列表渲染 items 列时检测：items 数组空则显示头的 inline 单 SKU 简略 |
| Vue 动态行 SKU/库位联动 | 每行独立的 computed options（参考 iter-22 fix-3 模式，但作用于行级别） |

## 六、待用户运行验证（2 步）
1. **migrations**：
   ```bash
   docker-compose exec wms-backend php think migrate:run
   ```
2. **重启 wms-backend**：
   ```bash
   docker-compose restart wms-backend
   ```

## 七、剩余非阻塞（M3+）
- Q23-01：部分接收（明细级状态）
- Q23-02：行级取消（不影响其他行）
- Q23-03：调拨单导出 CSV（含明细展开）
