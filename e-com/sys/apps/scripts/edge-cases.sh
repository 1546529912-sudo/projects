#!/usr/bin/env bash
# edge-cases.sh · Phase 2 边界场景集成测试
# 用法：cd apps/ && ./scripts/edge-cases.sh
#
# 假设所有容器已启动（docker-compose up -d）。
# 不清理数据，每个场景用唯一 idempotency key 与时间戳区分。

# 不用 set -u，避免 echo 里中文+变量解析时 bash 误报 unbound
PASS=0
FAIL=0
OK_COUNT=0
FAIL_COUNT=0
RED='\033[0;31m'
GRN='\033[0;32m'
YLW='\033[0;33m'
CLR='\033[0m'

NOW=$(date +%s)
SHOP="http://localhost:8001"
PIM="http://localhost:8002"
OMS="http://localhost:8003"
WMS="http://localhost:8004"

pass() { echo -e "  ${GRN}PASS${CLR}: $1"; PASS=$((PASS + 1)); }
fail() { echo -e "  ${RED}FAIL${CLR}: $1"; FAIL=$((FAIL + 1)); }
section() { echo -e "\n${YLW}=== $1 ===${CLR}"; }
contains() { [[ "$1" == *"$2"* ]]; }

# 拿一个 token（前置）
get_token() {
  curl -s -X POST "$SHOP/api/v1/sms/code" \
    -H 'Content-Type: application/json' -d '{"phone":"13800138000"}' > /dev/null
  curl -s -X POST "$SHOP/api/v1/user/login" \
    -H 'Content-Type: application/json' \
    -d '{"phone":"13800138000","code":"123456"}' \
    | python3 -c "import json,sys;d=json.load(sys.stdin);print((d.get('data') or {}).get('token',''))"
}

echo "Edge-case 集成测试 · NOW=$NOW"

# === 前置：拿 token ===
TOKEN=$(get_token)
if [[ -z "$TOKEN" ]]; then
  echo -e "${RED}前置失败：拿不到 token，请确认 shop-backend 已启动${CLR}"
  exit 1
fi
echo "TOKEN length=${#TOKEN}"

# ============================================================
# 场景 1：超卖（一次性下单 999 件）
# ============================================================
section "[1] 超卖：qty=999 应被 OMS 拦截"
curl -s -X POST "$SHOP/api/v1/cart/clear-invalid" -H "Authorization: Bearer $TOKEN" > /dev/null
# 直接调 OMS 跳过购物车，构造超卖 case
RESP=$(curl -s -X POST "$OMS/api/v1/order/create" \
  -H "Idempotency-Key: edge-1-$NOW" \
  -H 'Content-Type: application/json' \
  -d "{
    \"user_id\": 1,
    \"items\": [{\"sku_code\": \"SPU001-001\", \"qty\": 999}],
    \"address\": {\"name\":\"测\",\"phone\":\"13800138000\",\"detail\":\"测\"}
  }")
echo "    响应：$RESP"
if contains "$RESP" "库存不足"; then
  pass "超卖被拦截（含'库存不足'）"
else
  fail "应返回'库存不足'，实际：$RESP"
fi

# ============================================================
# 场景 2：同 SKU 并发下单（5 个并发，初始库存若 < 5 应有部分失败）
# ============================================================
section "[2] 并发下单 5 个（行锁应保证无超卖）"
# 查当前 SPU003-002 余量
INV=$(curl -s "$OMS/api/v1/inventory/SPU003-002" | python3 -c "import json,sys;print(json.load(sys.stdin)['data']['available'])")
echo "    当前 SPU003-002 available=$INV"

# 并发下 5 单各 1 件
for i in 1 2 3 4 5; do
  curl -s -X POST "$OMS/api/v1/order/create" \
    -H "Idempotency-Key: edge-2-$NOW-$i" \
    -H 'Content-Type: application/json' \
    -d "{
      \"user_id\": 1,
      \"items\": [{\"sku_code\": \"SPU003-002\", \"qty\": 1}],
      \"address\": {\"name\":\"测\",\"phone\":\"13800138000\",\"detail\":\"测\"}
    }" > /tmp/edge2-$i.txt &
done
wait

OK_COUNT=0
FAIL_COUNT=0
for i in 1 2 3 4 5; do
  if contains "$(cat /tmp/edge2-$i.txt)" "\"code\":0"; then
    OK_COUNT=$((OK_COUNT + 1))
  else
    FAIL_COUNT=$((FAIL_COUNT + 1))
  fi
done
echo "    并发结果：$OK_COUNT 成功 / $FAIL_COUNT 失败"

INV_AFTER=$(curl -s "$OMS/api/v1/inventory/SPU003-002" | python3 -c "import json,sys;print(json.load(sys.stdin)['data']['available'])")
echo "    并发后 available=$INV_AFTER, locked 应增加 $OK_COUNT"
# 期望：available 减少了 OK_COUNT
if [[ $((INV - INV_AFTER)) -eq $OK_COUNT ]]; then
  pass "并发库存账本正确（减少 $OK_COUNT）"
else
  fail "available 应减少 $OK_COUNT，实际减少 $((INV - INV_AFTER))"
fi
rm -f /tmp/edge2-*.txt

# ============================================================
# 场景 3：幂等键复用
# ============================================================
section "[3] 幂等键复用：同 Idempotency-Key 调两次"
IDEM="edge-3-$NOW"
RESP1=$(curl -s -X POST "$OMS/api/v1/order/create" \
  -H "Idempotency-Key: $IDEM" -H 'Content-Type: application/json' \
  -d "{\"user_id\":1,\"items\":[{\"sku_code\":\"SPU001-002\",\"qty\":1}],\"address\":{\"name\":\"测\",\"phone\":\"13800138000\",\"detail\":\"测\"}}")
ORDER1=$(echo "$RESP1" | python3 -c "import json,sys;print(json.load(sys.stdin)['data']['order']['order_no'])" 2>/dev/null || echo "")

RESP2=$(curl -s -X POST "$OMS/api/v1/order/create" \
  -H "Idempotency-Key: $IDEM" -H 'Content-Type: application/json' \
  -d "{\"user_id\":1,\"items\":[{\"sku_code\":\"SPU001-002\",\"qty\":1}],\"address\":{\"name\":\"测\",\"phone\":\"13800138000\",\"detail\":\"测\"}}")
ORDER2=$(echo "$RESP2" | python3 -c "import json,sys;print(json.load(sys.stdin)['data']['order']['order_no'])" 2>/dev/null || echo "")

echo "    第 1 次 ORDER=$ORDER1"
echo "    第 2 次 ORDER=$ORDER2"
if [[ -n "$ORDER1" && "$ORDER1" == "$ORDER2" ]]; then
  pass "幂等键复用返回同一 order_no"
else
  fail "两次 order_no 不一致或为空"
fi

# ============================================================
# 场景 4：SKU 下架后下单
# ============================================================
section "[4] SKU 下架后下单（直接改 DB status='disabled' 模拟）"
docker-compose exec -T mysql mysql -uroot -proot -e \
  "UPDATE pim_db.skus SET status='disabled' WHERE sku_code='SPU001-001';" 2>/dev/null
RESP=$(curl -s -X POST "$OMS/api/v1/order/create" \
  -H "Idempotency-Key: edge-4-$NOW" \
  -H 'Content-Type: application/json' \
  -d "{\"user_id\":1,\"items\":[{\"sku_code\":\"SPU001-001\",\"qty\":1}],\"address\":{\"name\":\"测\",\"phone\":\"13800138000\",\"detail\":\"测\"}}")
echo "    响应：$RESP"
if contains "$RESP" "下架" || contains "$RESP" "不存在"; then
  pass "下架 SKU 被拦截"
else
  fail "下架 SKU 仍能下单：$RESP"
fi
# 恢复
docker-compose exec -T mysql mysql -uroot -proot -e \
  "UPDATE pim_db.skus SET status='enabled' WHERE sku_code='SPU001-001';" 2>/dev/null

# ============================================================
# 场景 5：空购物车 submit
# ============================================================
section "[5] 空购物车 submit"
# 清空购物车
curl -s -H "Authorization: Bearer $TOKEN" "$SHOP/api/v1/cart/list" \
  | python3 -c "import json,sys;d=json.load(sys.stdin);[print(x['id']) for x in (d.get('data') or {}).get('list', [])]" \
  | xargs -I {} curl -s -X DELETE -H "Authorization: Bearer $TOKEN" "$SHOP/api/v1/cart/{}" > /dev/null
RESP=$(curl -s -X POST "$SHOP/api/v1/order/submit" \
  -H "Authorization: Bearer $TOKEN" -H "Idempotency-Key: edge-5-$NOW" \
  -H 'Content-Type: application/json' -d '{}')
echo "    响应：$RESP"
if contains "$RESP" "请先勾选商品"; then
  pass "空购物车 submit 被拦截"
else
  fail "应提示空购物车：$RESP"
fi

# ============================================================
# 场景 6：重复支付同一订单
# ============================================================
section "[6] 重复支付：先下一单 → 支付 → 再次支付应失败"
RESP=$(curl -s -X POST "$OMS/api/v1/order/create" \
  -H "Idempotency-Key: edge-6-$NOW" \
  -H 'Content-Type: application/json' \
  -d "{\"user_id\":1,\"items\":[{\"sku_code\":\"SPU001-002\",\"qty\":1}],\"address\":{\"name\":\"测\",\"phone\":\"13800138000\",\"detail\":\"测\"}}")
ORDER6=$(echo "$RESP" | python3 -c "import json,sys;print(json.load(sys.stdin)['data']['order']['order_no'])" 2>/dev/null || echo "")
echo "    新订单 $ORDER6"

curl -s -X POST "$OMS/api/v1/payment/callback" \
  -H 'Content-Type: application/json' -d "{\"order_no\":\"$ORDER6\"}" > /dev/null
sleep 1

RESP2=$(curl -s -X POST "$OMS/api/v1/payment/callback" \
  -H 'Content-Type: application/json' -d "{\"order_no\":\"$ORDER6\"}")
echo "    第 2 次支付响应：$RESP2"
if contains "$RESP2" "非法转移" || contains "$RESP2" "code\":409"; then
  pass "重复支付被状态机拦截"
else
  fail "应返回状态机错误：$RESP2"
fi

# ============================================================
# 场景 7：取消非 pending_pay 订单
# ============================================================
section "[7] 取消已 paid 订单（沿用 #6 已 paid 的 $ORDER6）"
RESP=$(curl -s -X POST "$OMS/api/v1/order/$ORDER6/cancel" \
  -H 'Content-Type: application/json' \
  -d '{"user_id":1,"reason":"test"}')
echo "    响应：$RESP"
if contains "$RESP" "不可取消" || contains "$RESP" "非法转移"; then
  pass "已支付订单不可取消"
else
  fail "应拒绝取消：$RESP"
fi

# ============================================================
# 场景 8：非本人取消订单
# ============================================================
section "[8] 非本人 user_id=999 取消订单 $ORDER6"
RESP=$(curl -s -X POST "$OMS/api/v1/order/$ORDER6/cancel" \
  -H 'Content-Type: application/json' \
  -d '{"user_id":999,"reason":"test"}')
echo "    响应：$RESP"
if contains "$RESP" "非本人"; then
  pass "非本人取消被拦截"
else
  # 也可能因为状态错误先拦下来
  if contains "$RESP" "不可取消" || contains "$RESP" "非法转移"; then
    pass "被状态校验拦截（也符合预期）"
  else
    fail "应拦截：$RESP"
  fi
fi

# ============================================================
# 场景 9：无效 token 访问需鉴权接口
# ============================================================
section "[9] 无效 token 访问 /user/me"
RESP=$(curl -s -H "Authorization: Bearer invalid.jwt.token" "$SHOP/api/v1/user/me")
echo "    响应：$RESP"
if contains "$RESP" "token 无效" || contains "$RESP" "未登录"; then
  pass "无效 token 被拦截"
else
  fail "应返回 401：$RESP"
fi

# ============================================================
# 场景 10：WMS 不可达时下单（暂停 WMS 容器）
# ============================================================
section "[10] WMS 不可达时支付：OMS 订单应仍 paid，picking_orders.status=failed"
echo "    停 wms-backend ..."
docker-compose stop wms-backend > /dev/null 2>&1
sleep 2

# 新订单 + 支付（WMS 会调失败）
RESP=$(curl -s -X POST "$OMS/api/v1/order/create" \
  -H "Idempotency-Key: edge-10-$NOW" \
  -H 'Content-Type: application/json' \
  -d "{\"user_id\":1,\"items\":[{\"sku_code\":\"SPU002-001\",\"qty\":1}],\"address\":{\"name\":\"测\",\"phone\":\"13800138000\",\"detail\":\"测\"}}")
ORDER10=$(echo "$RESP" | python3 -c "import json,sys;print(json.load(sys.stdin)['data']['order']['order_no'])" 2>/dev/null || echo "")
echo "    新订单 $ORDER10"

curl -s -X POST "$OMS/api/v1/payment/callback" \
  -H 'Content-Type: application/json' -d "{\"order_no\":\"$ORDER10\"}" > /dev/null

# 查订单状态
STATUS=$(curl -s "$OMS/api/v1/order/$ORDER10" | python3 -c "import json,sys;print(json.load(sys.stdin)['data']['order']['status'])" 2>/dev/null)
echo "    订单状态：$STATUS"

# 查 picking_orders
PICKING_STATUS=$(docker-compose exec -T mysql mysql -uroot -proot -N -e \
  "SELECT status FROM oms_db.picking_orders WHERE order_no='$ORDER10' ORDER BY id DESC LIMIT 1;" 2>/dev/null | tr -d '\r')
echo "    picking_orders.status=$PICKING_STATUS"

PASS_10=true
if [[ "$STATUS" != "paid" ]]; then
  fail "OMS 订单不是 paid，实际：$STATUS"
  PASS_10=false
fi
if [[ "$PICKING_STATUS" != "failed" ]]; then
  fail "picking_orders.status 不是 failed，实际：$PICKING_STATUS"
  PASS_10=false
fi
if $PASS_10; then
  pass "WMS 不可达 → OMS 订单 paid + picking_orders failed"
fi

echo "    恢复 wms-backend ..."
docker-compose start wms-backend > /dev/null 2>&1
sleep 3

# ============================================================
# 汇总
# ============================================================
echo ""
echo -e "${YLW}===============================${CLR}"
echo -e "汇总：${GRN}$PASS PASS${CLR} / ${RED}$FAIL FAIL${CLR}"
echo -e "${YLW}===============================${CLR}"

[[ $FAIL -eq 0 ]]
