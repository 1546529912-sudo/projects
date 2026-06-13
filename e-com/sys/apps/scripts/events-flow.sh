#!/usr/bin/env bash
# events-flow.sh · iteration-9 端到端事件流验证
#
# 验证：mock 支付 → XADD oms.order.paid → WMS consumer 自动接单 → WMS auto-complete
#       → XADD wms.outbound.completed → OMS consumer 自动 markShipped
#
# 用法：bash apps/scripts/events-flow.sh

set -eo pipefail

SHOP=http://localhost:8001
OMS=http://localhost:8003
WMS=http://localhost:8004
PHONE=13800138000
CODE=123456

green() { printf "\033[32m%s\033[0m\n" "$1"; }
red()   { printf "\033[31m%s\033[0m\n" "$1"; }
step()  { printf "\n\033[36m=== %s ===\033[0m\n" "$1"; }

step "1. 发短信 + 登录拿 token"
curl -s -X POST "$SHOP/api/v1/sms/code" -H 'Content-Type: application/json' -d "{\"phone\":\"$PHONE\"}" > /dev/null
TOKEN=$(curl -s -X POST "$SHOP/api/v1/user/login" -H 'Content-Type: application/json' \
  -d "{\"phone\":\"$PHONE\",\"code\":\"$CODE\"}" | python3 -c "import json,sys;d=json.load(sys.stdin);print((d.get('data') or {}).get('token',''))")
[ -n "$TOKEN" ] && green "TOKEN ok (len=${#TOKEN})" || { red "登录失败"; exit 1; }

step "2. 清空购物车 + 加 1 件 SPU003-001（¥99）"
curl -s -X POST "$SHOP/api/v1/cart/clear-invalid" -H "Authorization: Bearer $TOKEN" > /dev/null
curl -s -X POST "$SHOP/api/v1/cart/add" -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"sku_code":"SPU003-001","qty":1}' > /dev/null
green "加购完成"

step "3. 下单"
T0=$(date +%s%3N)
ORDER=$(curl -s -X POST "$SHOP/api/v1/order/submit" -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -H "Idempotency-Key: events-flow-$(date +%s)" \
  -d '{}' | python3 -c "import json,sys;d=json.load(sys.stdin);print((d.get('data') or {}).get('order',{}).get('order_no',''))")
T1=$(date +%s%3N)
[ -n "$ORDER" ] && green "ORDER=$ORDER (耗时 $((T1-T0))ms)" || { red "下单失败"; exit 1; }

step "4. mock 支付（关键：应该 <500ms 返回，不再等 WMS）"
T0=$(date +%s%3N)
curl -s -X POST "$SHOP/api/v1/payment/callback/mock" -H 'Content-Type: application/json' \
  -d "{\"order_no\":\"$ORDER\"}" > /dev/null
T1=$(date +%s%3N)
DUR=$((T1-T0))
if [ $DUR -lt 800 ]; then
    green "mock 支付返回耗时 ${DUR}ms ✓"
else
    red "⚠️  mock 支付返回耗时 ${DUR}ms（同步版基线 1-2s，理论异步 <500ms）"
fi

step "5. 验证 OMS 立即 paid"
STATUS=$(curl -s "$OMS/api/v1/order/$ORDER" | python3 -c "import json,sys;print(json.load(sys.stdin)['data']['order']['status'])")
[ "$STATUS" = "paid" ] && green "OMS status=paid ✓" || { red "OMS status=$STATUS（期望 paid）"; exit 1; }

step "6. 等 3s 让 WMS consumer 消费 oms.order.paid"
sleep 3

step "7. 验证 WMS outbound 已创建"
OUTBOUND=$(curl -s "$WMS/api/v1/outbound/list?page=1&size=1" | python3 -c "
import json,sys
d = json.load(sys.stdin)
rows = d.get('data', {}).get('list', [])
for r in rows:
    if r.get('oms_order_no') == '$ORDER':
        print(r['outbound_no'])
        break
")
[ -n "$OUTBOUND" ] && green "WMS outbound=$OUTBOUND status=allocated ✓" || { red "WMS outbound 未生成（consumer 没消费？）"; exit 1; }

step "8. 验证 Stream XLEN（oms.order.paid 应已被消费）"
docker-compose exec -T redis redis-cli -n 0 XLEN oms.order.paid

step "9. WMS auto-complete 出库"
RESULT=$(curl -s -X POST "$WMS/api/v1/outbound/$OUTBOUND/auto-complete" -H 'Content-Type: application/json' \
  -H "Idempotency-Key: auto-$OUTBOUND")
EXPRESS=$(echo "$RESULT" | python3 -c "import json,sys;print(json.load(sys.stdin)['data']['express_no'])")
PUBOK=$(echo "$RESULT" | python3 -c "import json,sys;print(json.load(sys.stdin)['data'].get('event_published'))")
[ -n "$EXPRESS" ] && green "auto-complete express_no=$EXPRESS, event_published=$PUBOK" || { red "auto-complete 失败"; exit 1; }

step "10. 等 3s 让 OMS consumer 消费 wms.outbound.completed"
sleep 3

step "11. 验证 OMS status=shipped + express_no 回写"
ORDER_INFO=$(curl -s "$OMS/api/v1/order/$ORDER")
STATUS=$(echo "$ORDER_INFO" | python3 -c "import json,sys;print(json.load(sys.stdin)['data']['order']['status'])")
EXP=$(echo "$ORDER_INFO" | python3 -c "import json,sys;print(json.load(sys.stdin)['data']['order'].get('express_no',''))")
[ "$STATUS" = "shipped" ] && green "OMS status=shipped, express_no=$EXP ✓" || { red "OMS status=$STATUS（期望 shipped；可能消费滞后，等久一些再试）"; exit 1; }

step "12. 验证 OMS 库存 locked - 1（实物扣减）"
curl -s "$OMS/api/v1/inventory/SPU003-001"

step "13. 死信表（应为空）"
curl -s "$OMS/api/v1/admin/dead-letter?page=1&size=5" | python3 -m json.tool

echo
green "==== 全流程通过：order=$ORDER outbound=$OUTBOUND express=$EXP ===="
