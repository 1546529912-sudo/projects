<script setup lang="ts">
import { RouterLink, RouterView, useRoute } from 'vue-router'
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue'

const route = useRoute()

interface MenuItem {
  name: string
  label: string
  icon: string
  group?: string
}

const menu: MenuItem[] = [
  { name: 'admin-dashboard',     label: '总览',         icon: '◫', group: '运营' },
  { name: 'admin-stock-alerts',  label: '库存预警',     icon: '⚠' },
  { name: 'admin-bad-cases',     label: 'AI Bad Case',  icon: '💬' },
  { name: 'admin-failed-jobs',   label: '死信队列',     icon: '⊘' },

  { name: 'admin-companies',     label: '企业认证审核', icon: '✓', group: '业务' },
  { name: 'admin-products',      label: '商品管理',     icon: '▤' },
  { name: 'admin-orders',        label: '订单管理',     icon: '◰' },
  { name: 'admin-knowledge',     label: '知识库',       icon: '☰' },
]

const grouped = computed(() => {
  const groups: { name: string; items: MenuItem[] }[] = []
  let current: { name: string; items: MenuItem[] } | null = null
  for (const item of menu) {
    if (item.group) {
      current = { name: item.group, items: [item] }
      groups.push(current)
    } else if (current) {
      current.items.push(item)
    }
  }
  return groups
})

// 商品编辑/新建路由名也算"商品管理"高亮
function isActive(name: string): boolean {
  const r = route.name as string | undefined
  if (!r) return false
  if (name === 'admin-products' && (r === 'admin-product-new' || r === 'admin-product-edit')) return true
  return r === name
}

// iter-22 面包屑
type Crumb = { label: string; name?: string; params?: Record<string, any> }
// 路由名 → { label, parent }
const CRUMB_MAP: Record<string, { label: string; parent?: string }> = {
  'admin-dashboard':     { label: '总览' },
  'admin-stock-alerts':  { label: '库存预警',     parent: 'admin-dashboard' },
  'admin-bad-cases':     { label: 'AI Bad Case',  parent: 'admin-dashboard' },
  'admin-failed-jobs':   { label: '死信队列',     parent: 'admin-dashboard' },
  'admin-companies':     { label: '企业认证审核', parent: 'admin-dashboard' },
  'admin-products':      { label: '商品管理',     parent: 'admin-dashboard' },
  'admin-product-new':   { label: '新建商品',     parent: 'admin-products' },
  'admin-product-edit':  { label: '编辑商品',     parent: 'admin-products' },
  'admin-orders':        { label: '订单管理',     parent: 'admin-dashboard' },
  'admin-knowledge':     { label: '知识库',       parent: 'admin-dashboard' },
}

const breadcrumb = computed<Crumb[]>(() => {
  const trail: Crumb[] = []
  let cur = route.name as string | undefined
  while (cur && CRUMB_MAP[cur]) {
    const node = CRUMB_MAP[cur]
    let label = node.label
    // 编辑页带上 id
    if (cur === 'admin-product-edit' && route.params.id) {
      label = `编辑商品 #${route.params.id}`
    }
    trail.unshift({ label, name: cur, params: route.params as any })
    cur = node.parent
  }
  // 最后一项是当前页（不可点）；前面的都可点
  if (trail.length > 0) trail[trail.length - 1].name = undefined
  return trail
})

// iter-21 折叠态
const NARROW_BREAKPOINT = 1024
const STORAGE_KEY = 'admin.sidebar.collapsed'
const userOverrode = ref(false)
const collapsed = ref(false)

function readPersisted(): boolean | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v === '1') return true
    if (v === '0') return false
  } catch {}
  return null
}

function autoFromWidth(): boolean {
  return typeof window !== 'undefined' && window.innerWidth < NARROW_BREAKPOINT
}

function applyAuto() {
  if (userOverrode.value) return
  collapsed.value = autoFromWidth()
}

function toggle() {
  collapsed.value = !collapsed.value
  userOverrode.value = true
  try { localStorage.setItem(STORAGE_KEY, collapsed.value ? '1' : '0') } catch {}
}

let resizeListener: (() => void) | null = null
onMounted(() => {
  const persisted = readPersisted()
  if (persisted !== null) {
    collapsed.value = persisted
    userOverrode.value = true
  } else {
    collapsed.value = autoFromWidth()
  }
  resizeListener = () => applyAuto()
  window.addEventListener('resize', resizeListener)
})
onBeforeUnmount(() => {
  if (resizeListener) window.removeEventListener('resize', resizeListener)
})

watch(collapsed, () => { /* placeholder for future: emit event */ })
</script>

<template>
  <div class="admin-shell" :class="{ collapsed }">
    <aside class="sidebar">
      <header class="brand">
        <div class="brand-icon">⚙</div>
        <div v-if="!collapsed" class="brand-text">
          <div class="brand-line1">管理后台</div>
          <div class="brand-line2">中研复材</div>
        </div>
        <button
          class="toggle"
          :title="collapsed ? '展开侧边栏' : '收起侧边栏'"
          @click="toggle"
        >{{ collapsed ? '›' : '‹' }}</button>
      </header>

      <nav class="menu">
        <div v-for="g in grouped" :key="g.name" class="group">
          <div v-if="!collapsed" class="group-label">{{ g.name }}</div>
          <RouterLink
            v-for="it in g.items"
            :key="it.name"
            :to="{ name: it.name }"
            class="item"
            :class="{ active: isActive(it.name) }"
            :title="collapsed ? it.label : ''"
          >
            <span class="icon">{{ it.icon }}</span>
            <span v-if="!collapsed" class="label">{{ it.label }}</span>
          </RouterLink>
        </div>
      </nav>

      <footer class="back">
        <RouterLink to="/profile" class="back-link" :title="collapsed ? '返回个人中心' : ''">
          <span v-if="collapsed">←</span>
          <span v-else>← 返回个人中心</span>
        </RouterLink>
      </footer>
    </aside>

    <main class="content">
      <nav v-if="breadcrumb.length > 1" class="crumbs" aria-label="breadcrumb">
        <template v-for="(c, i) in breadcrumb" :key="i">
          <RouterLink v-if="c.name" :to="{ name: c.name, params: c.params }" class="crumb-link">
            {{ c.label }}
          </RouterLink>
          <span v-else class="crumb-current">{{ c.label }}</span>
          <span v-if="i < breadcrumb.length - 1" class="crumb-sep">›</span>
        </template>
      </nav>
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.admin-shell {
  display: flex;
  min-height: calc(100vh - 64px);
  background: var(--color-surface-soft);
}

.sidebar {
  width: 220px;
  flex-shrink: 0;
  background: var(--color-canvas);
  border-right: 1px solid var(--color-hairline);
  display: flex;
  flex-direction: column;
  transition: width 0.2s ease;
}
.admin-shell.collapsed .sidebar {
  width: 56px;
}

.brand {
  display: flex;
  align-items: center;
  gap: var(--space-base);
  padding: var(--space-lg) var(--space-md);
  border-bottom: 1px solid var(--color-hairline);
  position: relative;
}
.admin-shell.collapsed .brand {
  padding: var(--space-md) 8px;
  justify-content: center;
}
.brand-icon {
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-primary);
  color: white;
  border-radius: var(--radius-sm);
  font-size: 18px;
}
.brand-text { flex: 1; min-width: 0; }
.brand-line1 { font-size: 14px; font-weight: 600; }
.brand-line2 { font-size: 11px; color: var(--color-muted); }

.toggle {
  position: absolute;
  right: -12px;
  top: 50%;
  transform: translateY(-50%);
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 1px solid var(--color-hairline);
  background: var(--color-canvas);
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-muted);
  z-index: 5;
}
.toggle:hover { color: var(--color-primary); border-color: var(--color-primary); }

.menu {
  flex: 1;
  padding: var(--space-md) 0;
  overflow-y: auto;
}
.group + .group { margin-top: var(--space-md); }
.group-label {
  padding: var(--space-xs) var(--space-md);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-muted);
}
.admin-shell.collapsed .group + .group {
  margin-top: var(--space-xs);
  padding-top: var(--space-xs);
  border-top: 1px solid var(--color-hairline-soft);
}

.item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 16px;
  font-size: 14px;
  color: inherit;
  text-decoration: none;
  border-left: 3px solid transparent;
}
.admin-shell.collapsed .item {
  justify-content: center;
  padding: 10px 0;
  gap: 0;
}
.item:hover { background: var(--color-surface-soft); }
.item.active {
  background: rgba(0, 47, 167, 0.06);
  color: var(--color-primary);
  border-left-color: var(--color-primary);
  font-weight: 500;
}
.icon {
  width: 20px;
  display: inline-block;
  text-align: center;
  font-size: 14px;
  opacity: 0.8;
}
.admin-shell.collapsed .icon { font-size: 16px; opacity: 1; }

.back {
  padding: var(--space-md);
  border-top: 1px solid var(--color-hairline);
}
.admin-shell.collapsed .back { padding: var(--space-xs); }
.back-link {
  display: block;
  text-align: center;
  font-size: 13px;
  color: var(--color-muted);
  text-decoration: none;
  padding: 6px;
  border-radius: var(--radius-sm);
}
.back-link:hover { background: var(--color-surface-soft); color: var(--color-primary); }

.content {
  flex: 1;
  min-width: 0;
  overflow-x: auto;
}

/* iter-22 面包屑 */
.crumbs {
  padding: 12px var(--space-lg);
  font-size: 13px;
  background: var(--color-canvas);
  border-bottom: 1px solid var(--color-hairline);
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.crumb-link {
  color: var(--color-muted);
  text-decoration: none;
}
.crumb-link:hover { color: var(--color-primary); }
.crumb-current {
  color: var(--color-text, #111);
  font-weight: 500;
}
.crumb-sep {
  color: var(--color-muted);
  opacity: 0.6;
}
</style>
