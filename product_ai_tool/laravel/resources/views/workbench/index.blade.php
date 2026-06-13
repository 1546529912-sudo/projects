@extends('layouts.workbench')

@section('title', '工作台')

@push('styles')
<style>
    [x-cloak]{display:none!important}
    .wb-root { display: flex; flex-direction: column; height: 100vh; min-height: 640px; }
    .wb-header { display: flex; flex-wrap: wrap; align-items: center; gap: 0.75rem; border-bottom: 1px solid #000; padding: 0.75rem 1rem; flex-shrink: 0; }
    .wb-brand { font-size: 0.875rem; font-weight: 700; }
    .wb-chip { border-radius: 999px; background: #efefef; padding: 0.25rem 0.75rem; font-size: 0.75rem; font-weight: 500; }
    .wb-header-tools { margin-left: auto; display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; }
    .wb-ann-toggle { display: flex; align-items: center; gap: 0.35rem; margin: 0; font-size: 0.75rem; color: #4b4b4b; cursor: pointer; user-select: none; }
    .wb-ann-toggle input { margin: 0; }
    .wb-seg { display: flex; border: 1px solid #000; border-radius: 999px; padding: 2px; }
    .wb-seg button { border: none; border-radius: 999px; padding: 0.35rem 0.75rem; font-size: 0.75rem; font-weight: 500; cursor: pointer; background: #efefef; color: #000; }
    .wb-seg button.on { background: #000; color: #fff; }
    .wb-body { display: flex; flex: 1; min-height: 0; flex-direction: column; }
    @media (min-width: 1024px) {
      .wb-body { flex-direction: row; }
    }
    .wb-aside { width: 100%; flex-shrink: 0; border-bottom: 1px solid #000; padding: 1rem; overflow-y: auto; }
    @media (min-width: 1024px) {
      .wb-aside { width: 22rem; border-bottom: none; border-right: 1px solid #000; }
    }
    .wb-aside.wb-right { border-bottom: 1px solid #000; border-right: none; }
    @media (min-width: 1024px) {
      .wb-aside.wb-right { width: 22rem; border-left: 1px solid #000; border-top: none; border-bottom: none; }
    }
    .wb-aside-flex { display: flex; flex-direction: column; min-height: 0; }
    .wb-aside-scroll { min-height: 0; overflow-y: auto; }
    .wb-section-grow { margin-top: 0.35rem; padding-top: 0.6rem; border-top: 1px solid #eee; }
    @media (min-width: 1024px) {
      .wb-section-grow { margin-top: auto; }
    }
    .wb-h2 { font-size: 0.65rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #afafaf; margin: 0 0 0.5rem; }
    .wb-notice { margin-top: 0.5rem; padding: 0.5rem 0.75rem; border: 1px solid #000; background: #efefef; border-radius: 0.5rem; font-size: 0.75rem; }
    .wb-warn { margin-top: 0.5rem; font-size: 0.75rem; color: #92400e; }
    .wb-form { margin-top: 0.75rem; display: flex; flex-direction: column; gap: 0.75rem; }
    .wb-label { display: block; font-size: 0.75rem; color: #4b4b4b; margin-bottom: 0.25rem; }
    .wb-input, .wb-textarea, .wb-select { width: 100%; border: 1px solid #000; border-radius: 0.5rem; padding: 0.5rem 0.75rem; font-size: 0.875rem; background: #fff; }
    .wb-textarea { min-height: 340px; resize: vertical; }
    .wb-textarea.sm { min-height: 72px; }
    .wb-btn { border-radius: 999px; background: #000; color: #fff; border: none; padding: 0.5rem 1rem; font-size: 0.75rem; font-weight: 500; cursor: pointer; }
    .wb-btn:hover { opacity: 0.9; }
    .wb-btn-sec { background: #efefef; color: #000; border: 1px solid #000; }
    .wb-btn-sec.on { background: #000; color: #fff; }
    .wb-btn-danger { background: #fff; color: #b91c1c; border: 1px solid #b91c1c; }
    .wb-main { flex: 1; min-width: 0; min-height: 0; padding: 1rem; display: flex; flex-direction: column; }
    .wb-empty { flex: 1; min-height: 360px; display: flex; align-items: center; justify-content: center; border: 1px solid #000; border-radius: 0.75rem; padding: 0 1.5rem; text-align: center; font-size: 0.875rem; color: #4b4b4b; background: #fff; }
    .wb-frame-wrap { position: relative; flex: 1; min-height: 360px; border: 1px solid #000; border-radius: 0.75rem; overflow: hidden; background: #fff; box-shadow: 0 4px 16px rgba(0,0,0,0.12); }
    .wb-frame { display: block; width: 100%; height: 100%; min-height: 360px; border: 0; background: #fff; }
    .wb-overlay-annotate { position: absolute; inset: 0; z-index: 2; }
    .wb-pin { position: absolute; width: 26px; height: 26px; margin: 0; padding: 0; border: 2px solid #fff; border-radius: 999px; background: #000; color: #fff; font-size: 10px; font-weight: 700; cursor: pointer; transform: translate(-50%, -50%); display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(0,0,0,0.2); }
    .wb-pin-selected { outline: 3px solid #f59e0b; outline-offset: 1px; z-index: 5; }
    .wb-overlay-ring { pointer-events: none; position: absolute; inset: 0; z-index: 4; border-radius: 0.75rem; box-shadow: inset 0 0 0 2px rgba(0,0,0,0.2); }
    .wb-msg { margin-top: 0.5rem; font-size: 0.75rem; color: #c00; }
    .wb-protocol { margin-top: 0.5rem; font-size: 0.75rem; line-height: 1.5; color: #4b4b4b; }
    .wb-list { margin-top: 0.5rem; list-style: none; padding: 0; margin-bottom: 0; max-height: 140px; overflow-y: auto; }
    .wb-list li { margin-top: 0.35rem; padding: 0.45rem 0.6rem; border: 1px solid rgba(0,0,0,0.12); border-radius: 0.5rem; font-size: 11px; color: #4b4b4b; background: #fff; cursor: pointer; }
    .wb-list li.on { border-color: #000; background: #efefef; }
    .wb-list-compact li { font-size: 10px; }
    .wb-ann-item { margin-top: 0.5rem; border: 1px solid rgba(0,0,0,0.12); border-radius: 0.75rem; background: #fff; overflow: hidden; }
    .wb-ann-item.on { border-color: #000; box-shadow: 0 0 0 1px #000 inset; }
    .wb-ann-head { display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem; cursor: pointer; }
    .wb-ann-main { flex: 1; min-width: 0; }
    .wb-ann-title { font-size: 0.8rem; font-weight: 700; color: #111; }
    .wb-ann-meta { margin-top: 0.2rem; font-size: 0.68rem; color: #9ca3af; }
    .wb-ann-toggle { width: 2rem; height: 2rem; border: 1px solid #000; border-radius: 999px; background: #fff; color: #000; font-size: 0.9rem; line-height: 1; cursor: pointer; flex-shrink: 0; }
    .wb-ann-body { padding: 0 0.75rem 0.75rem; border-top: 1px solid #eee; }
    .wb-muted { font-size: 0.7rem; color: #afafaf; }
    .wb-section { margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #eee; }
    .wb-row { display: flex; flex-wrap: wrap; gap: 0.35rem; margin-top: 0.35rem; }
    .wb-edit { margin-top: 0.75rem; padding: 0.75rem; border: 1px solid #000; border-radius: 0.5rem; background: #fafafa; }
    .wb-hint { font-size: 0.65rem; color: #6b7280; margin-top: 0.35rem; }
    .wb-version-item { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; font-size: 10px; padding: 0.35rem 0.5rem; border: 1px solid rgba(0,0,0,0.1); border-radius: 0.35rem; margin-top: 0.35rem; background: #fff; }
    .wb-version-item.cur { border-color: #000; background: #efefef; }
    .wb-version-list { max-height: 15.5rem; overflow-y: auto; padding-right: 0.2rem; }
    .wb-version-main { min-width: 0; flex: 1; }
    .wb-version-title { display: block; font-size: 0.72rem; font-weight: 700; color: #111; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .wb-version-meta { display: block; margin-top: 0.15rem; font-size: 0.64rem; color: #9ca3af; }
    .wb-progress-box { margin-top: 1rem; border: 1px solid #000; border-radius: 0.75rem; background: #fff; overflow: hidden; flex-shrink: 0; }
    .wb-progress-head { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; padding: 0.75rem; border-bottom: 1px solid #000; background: #efefef; }
    .wb-progress-title { font-size: 0.75rem; font-weight: 700; }
    .wb-progress-state { font-size: 0.7rem; color: #4b4b4b; }
    .wb-progress-body { height: 220px; overflow-y: auto; padding: 0.75rem; background: #0f172a; color: #e2e8f0; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, monospace; font-size: 12px; line-height: 1.55; }
    .wb-progress-stream { margin-bottom: 0.75rem; padding-bottom: 0.75rem; border-bottom: 1px solid rgba(255,255,255,0.12); color: #cbd5e1; white-space: pre-wrap; word-break: break-word; }
    .wb-progress-line { margin-top: 0.45rem; word-break: break-word; }
    .wb-progress-line:first-child { margin-top: 0; }
    .wb-progress-line.info { color: #dbeafe; }
    .wb-progress-line.success { color: #86efac; }
    .wb-progress-line.warning { color: #fde68a; }
    .wb-progress-line.error { color: #fca5a5; }
    .wb-progress-empty { color: #94a3b8; }
</style>
@endpush

@section('content')
<div
    class="wb-root"
    x-data="workbenchHost({ previewBase: @js($previewUrl), demoId: @js($demo?->id), defaultModel: @js($defaultModel), shouldAutoRefine: @js($shouldAutoRefine) })"
    x-init="init()"
>
    <header class="wb-header">
        <span class="wb-brand">AI Demo 工作台</span>
        <span class="wb-chip">模型</span>
        <select class="wb-select" style="width:auto;min-width:180px;padding:0.35rem 0.85rem;border-radius:999px" x-model="selectedModel">
            @foreach ($availableModels as $modelName)
                <option value="{{ $modelName }}">{{ $modelName }}</option>
            @endforeach
        </select>
        <div class="wb-header-tools">
            <div class="wb-seg" role="group" aria-label="模式">
                <button type="button" :class="previewMode ? 'on' : ''" @click="previewMode = true">预览</button>
                <button type="button" :class="!previewMode ? 'on' : ''" @click="previewMode = false">标注</button>
            </div>
            <label class="wb-ann-toggle" x-show="previewBase && previewMode" x-cloak>
                <input type="checkbox" x-model="showPinsInPreview">
                显示标注
            </label>
        </div>
    </header>

    <div class="wb-body">
        <aside class="wb-aside wb-aside-flex">
            <div class="wb-aside-scroll">
            <h2 class="wb-h2">需求</h2>
            @if (session('status'))
                <p class="wb-notice">{{ session('status') }}</p>
            @endif
            @if (session('generation_notice'))
                <p class="wb-warn" role="status">{{ session('generation_notice') }}</p>
            @endif
            <form method="post" action="{{ route('workbench.demos.store') }}" class="wb-form" @submit.prevent="submitGenerate($event)">
                @csrf
                <div>
                    <label for="title" class="wb-label">标题（可选）</label>
                    <input id="title" name="title" value="{{ old('title') }}" class="wb-input" placeholder="例如：商品详情 Demo">
                </div>
                <div>
                    <label for="prompt" class="wb-label">需求描述</label>
                    <textarea id="prompt" name="prompt" required class="wb-textarea" placeholder="描述希望生成的交互 Demo…">{{ old('prompt') }}</textarea>
                </div>
                <input type="hidden" name="model" :value="selectedModel">
                @error('prompt')
                    <p class="wb-msg">{{ $message }}</p>
                @enderror
                @error('model')
                    <p class="wb-msg">{{ $message }}</p>
                @enderror
                <button type="submit" class="wb-btn" :disabled="isGenerating" :style="isGenerating ? 'opacity:0.7;cursor:wait' : ''" x-text="isGenerating ? '生成中…' : '生成 Demo'"></button>
            </form>
            </div>

            <div class="wb-section-grow" x-show="demoId" x-cloak>
                <h2 class="wb-h2">版本</h2>
                <template x-if="!versions.length">
                    <p class="wb-muted" style="font-size:0.7rem">加载中或无版本…</p>
                </template>
                <div class="wb-version-list">
                    <template x-for="v in versions" :key="'ver-left-'+v.id">
                        <div class="wb-version-item" :class="{ cur: v.id === currentVersionId }">
                            <div class="wb-version-main">
                                <span class="wb-version-title" x-text="v.title || '未命名 Demo'"></span>
                                <span class="wb-version-meta" x-text="'v' + v.version_no + ' · ' + formatVersionTime(v.created_at)"></span>
                            </div>
                            <button type="button" class="wb-btn-sec" style="padding:0.25rem 0.5rem;font-size:10px;border-radius:999px" x-show="v.id !== currentVersionId" @click="restoreVersion(v.id)">恢复</button>
                        </div>
                    </template>
                </div>
            </div>
        </aside>

        <main class="wb-main">
            <template x-if="!previewBase">
                <div class="wb-empty">
                    暂无 Demo。左侧填写需求并点击「生成 Demo」。未配置 API Key 时将使用离线示例 HTML。
                </div>
            </template>
            <template x-if="previewBase">
                <div class="wb-frame-wrap">
                    <iframe
                        x-ref="demoFrame"
                        title="Demo preview"
                        class="wb-frame"
                        :src="previewSrc()"
                        sandbox="allow-scripts allow-forms allow-popups allow-modals allow-downloads allow-same-origin"
                    ></iframe>
                    <div
                        class="wb-overlay-annotate"
                        @click.self="onCanvasClick($event)"
                        :style="previewMode ? 'pointer-events:none' : 'pointer-events:auto'"
                    >
                        <template x-for="(a, idx) in sortedPinsForCanvas()" :key="'pin-'+a.id">
                            <button
                                type="button"
                                class="wb-pin"
                                :id="'wb-pin-'+a.id"
                                :class="{ 'wb-pin-selected': Number(selectedId) === Number(a.id) }"
                                :style="pinLayoutStyle(a)"
                                @click.stop="selectAnnotation(a.id)"
                                x-text="idx + 1"
                            ></button>
                        </template>
                    </div>
                    <div class="wb-overlay-ring" x-show="!previewMode" x-cloak aria-hidden="true"></div>
                </div>
            </template>
            <p class="wb-hint" x-show="previewBase && !previewMode" x-cloak>标注模式：在画布空白处点击添加 pin（绑定当前 pageKey）；点 pin 在右侧编辑。<strong>Pin 会随 iframe 内滚动对齐</strong>（新建标注生效；更早创建的标注需重新打点）。</p>
        </main>

        <aside class="wb-aside wb-right wb-aside-flex">
            <div class="wb-aside-scroll">
            <div x-show="demoId" x-cloak>
                <h2 class="wb-h2">标注</h2>
                <div class="wb-row">
                    <button type="button" class="wb-btn-sec" style="border-radius:999px;padding:0.35rem 0.75rem;font-size:0.7rem" :class="{ on: listScope === 'current' }" @click="listScope = 'current'">当前页</button>
                    <button type="button" class="wb-btn-sec" style="border-radius:999px;padding:0.35rem 0.75rem;font-size:0.7rem" :class="{ on: listScope === 'all' }" @click="listScope = 'all'">全部</button>
                </div>
                <div class="wb-row">
                    <button type="button" class="wb-btn-sec" style="border-radius:999px;padding:0.3rem 0.6rem;font-size:0.65rem" @click="statusFilter = ''" :class="{ on: statusFilter === '' }">全部状态</button>
                    <button type="button" class="wb-btn-sec" style="border-radius:999px;padding:0.3rem 0.6rem;font-size:0.65rem" @click="statusFilter = '未处理'" :class="{ on: statusFilter === '未处理' }">未处理</button>
                    <button type="button" class="wb-btn-sec" style="border-radius:999px;padding:0.3rem 0.6rem;font-size:0.65rem" @click="statusFilter = '已完成'" :class="{ on: statusFilter === '已完成' }">已完成</button>
                </div>
                <div class="wb-list" style="max-height:none;overflow:visible">
                    <template x-if="sortedListAnnotations().length === 0">
                        <div class="wb-muted" style="padding:0.5rem 0">无标注</div>
                    </template>
                    <template x-for="(a, idx) in sortedListAnnotations()" :key="'ann-'+a.id">
                        <div class="wb-ann-item" :class="{ on: Number(selectedId) === Number(a.id) && expandedId === Number(a.id) }">
                            <div class="wb-ann-head" @click="toggleAnnotation(a.id)">
                                <div class="wb-ann-main">
                                    <div class="wb-ann-title">
                                        <span x-text="(idx + 1) + '. '"></span><span x-text="a.title"></span>
                                    </div>
                                    <div class="wb-ann-meta" x-text="a.page_key + ' · ' + a.status"></div>
                                </div>
                                <button
                                    type="button"
                                    class="wb-ann-toggle"
                                    @click.stop="toggleAnnotation(a.id)"
                                    :title="expandedId === Number(a.id) ? '收起标注信息' : '展开标注信息'"
                                    x-text="expandedId === Number(a.id) ? '^' : 'v'"
                                ></button>
                            </div>

                            <div class="wb-ann-body" x-show="expandedId === Number(a.id)" x-cloak>
                                <div class="wb-edit" style="margin-top:0.75rem">
                                    <div class="wb-h2" style="margin:0;text-transform:none;letter-spacing:0;color:#000;font-size:0.75rem">编辑标注 #<span x-text="idx + 1"></span></div>
                                    <div class="wb-form" style="margin-top:0.5rem;gap:0.5rem">
                                        <div>
                                            <label class="wb-label">标题</label>
                                            <input class="wb-input" type="text" x-model="editForm.title">
                                        </div>
                                        <div>
                                            <label class="wb-label">描述</label>
                                            <textarea class="wb-textarea sm" x-model="editForm.description"></textarea>
                                        </div>
                                        <div>
                                            <label class="wb-label">类型</label>
                                            <select class="wb-select" x-model="editForm.type">
                                                <option value="说明">说明</option>
                                                <option value="修改建议">修改建议</option>
                                                <option value="问题">问题</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label class="wb-label">状态</label>
                                            <select class="wb-select" x-model="editForm.status">
                                                <option value="未处理">未处理</option>
                                                <option value="已完成">已完成</option>
                                            </select>
                                        </div>
                                        <div class="wb-row">
                                            <button type="button" class="wb-btn" @click="saveAnnotation()">保存</button>
                                            <button type="button" class="wb-btn-danger" @click="deleteAnnotation()">删除</button>
                                        </div>
                                        <p class="wb-hint" x-show="uiHint" x-cloak x-text="uiHint"></p>
                                        <div style="margin-top:0.75rem;padding-top:0.75rem;border-top:1px solid #ddd">
                                            <label class="wb-label">AI 补充说明（可选）</label>
                                            <textarea class="wb-textarea sm" x-model="revisionNote" placeholder="例如：请按标注放大按钮、修改文案…"></textarea>
                                            <button type="button" class="wb-btn" @click="reviseWithAi()">让 AI 按此标注修改 HTML</button>
                                            <p class="wb-hint">生成新版本并标记该标注为「已完成」。需配置 DEEPSEEK_API_KEY。</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </template>
                </div>
            </div>
            </div>

            <div class="wb-progress-box">
                <div class="wb-progress-head">
                    <div>
                        <div class="wb-progress-title">生成进度</div>
                        <div class="wb-progress-state" x-text="generationStatusText()"></div>
                    </div>
                    <button type="button" class="wb-btn-sec" style="padding:0.3rem 0.65rem;font-size:0.65rem;border-radius:999px" @click="clearGenerationLogs()" x-show="generationLogs.length">清空</button>
                </div>
                <div class="wb-progress-body" x-ref="generationLogBox">
                    <template x-if="streamedOutput">
                        <div class="wb-progress-stream" x-text="streamedPreview()"></div>
                    </template>
                    <template x-if="generationLogs.length === 0">
                        <div class="wb-progress-empty">这里会显示生成 Demo、重新生成以及 DeepSeek 调用过程。</div>
                    </template>
                    <template x-for="(item, idx) in generationLogs" :key="'glog-'+idx+'-'+item.time">
                        <div class="wb-progress-line" :class="item.level || 'info'">
                            <span x-text="'[' + item.time + '] ' + item.message"></span>
                        </div>
                    </template>
                </div>
            </div>
        </aside>
    </div>
</div>
@endsection

@push('scripts')
<script>
function workbenchHost(cfg) {
    return {
        previewBase: cfg.previewBase || null,
        previewBust: Date.now(),
        demoId: cfg.demoId,
        selectedModel: cfg.defaultModel || 'deepseek-v4-flash',
        pageKey: '—',
        stateKey: '',
        messages: [],
        previewMode: true,
        showPinsInPreview: true,
        annotations: [],
        listScope: 'current',
        statusFilter: '',
        selectedId: null,
        expandedId: null,
        editForm: { title: '', description: '', type: '说明', status: '未处理' },
        versions: [],
        currentVersionId: null,
        revisionNote: '',
        uiHint: '',
        iframeScrollVersion: 0,
        _iframeScrollCleanup: null,
        isGenerating: false,
        generationLogs: [],
        generationStatus: 'idle',
        streamedOutput: '',
        shouldAutoRefine: !!cfg.shouldAutoRefine,

        previewSrc() {
            if (!this.previewBase) {
                return '';
            }
            const sep = this.previewBase.includes('?') ? '&' : '?';

            return this.previewBase + sep + 'cb=' + this.previewBust;
        },

        clearAutoRefineFlagFromUrl() {
            try {
                const url = new URL(window.location.href);
                if (!url.searchParams.has('autorefine')) {
                    return;
                }
                url.searchParams.delete('autorefine');
                window.history.replaceState({}, '', url.toString());
            } catch (e) {
                console.warn('failed to clear autorefine flag', e);
            }
        },

        csrf() {
            const m = document.querySelector('meta[name="csrf-token"]');
            const t = m && m.getAttribute('content');
            if (!t) {
                throw new Error('缺少安全令牌，请刷新页面后重试。');
            }
            return t;
        },
        async api(method, url, body) {
            const opt = {
                method,
                credentials: 'same-origin',
                headers: {
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': this.csrf(),
                    'X-Requested-With': 'XMLHttpRequest',
                },
            };
            let payload = body;
            if (body !== undefined && body !== null && typeof body === 'object' && !Array.isArray(body)) {
                payload = Object.assign({ _token: this.csrf() }, body);
            }
            if (payload !== undefined) {
                opt.headers['Content-Type'] = 'application/json';
                opt.body = JSON.stringify(payload);
            }
            const r = await fetch(url, opt);
            const j = await r.json().catch(() => ({}));
            if (!r.ok) {
                let msg = j.message;
                if (!msg && j.errors && typeof j.errors === 'object') {
                    const firstKey = Object.keys(j.errors)[0];
                    const arr = firstKey ? j.errors[firstKey] : null;
                    if (Array.isArray(arr) && arr.length) {
                        msg = arr[0];
                    }
                }
                if (!msg) {
                    msg = r.status === 419
                        ? '页面已过期，请刷新后重试。'
                        : (r.statusText || ('HTTP ' + r.status));
                }
                throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
            }
            return j;
        },

        generationStatusText() {
            if (this.generationStatus === 'running') {
                return '处理中，右侧日志会持续刷新';
            }
            if (this.generationStatus === 'success') {
                return '已完成';
            }
            if (this.generationStatus === 'error') {
                return '执行失败';
            }
            return '等待开始';
        },

        streamedPreview() {
            if (!this.streamedOutput) {
                return '';
            }
            return this.streamedOutput.slice(-1200);
        },

        formatVersionTime(value) {
            if (!value) {
                return '';
            }
            const date = new Date(value);
            if (Number.isNaN(date.getTime())) {
                return '';
            }
            return date.toLocaleString('zh-CN', {
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
            });
        },

        pushGenerationLog(message, level = 'info', time = null) {
            this.generationLogs.push({
                message,
                level,
                time: time || new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }),
            });
            this.$nextTick(() => {
                const box = this.$refs.generationLogBox;
                if (box) {
                    box.scrollTop = box.scrollHeight;
                }
            });
        },

        clearGenerationLogs() {
            if (this.isGenerating) {
                return;
            }
            this.generationLogs = [];
            this.generationStatus = 'idle';
            this.streamedOutput = '';
        },

        async submitGenerate(event) {
            await this.submitGenerationForm(
                event.currentTarget,
                '{{ route('api.workbench.demos.generate-stream') }}'
            );
        },

        async submitGenerationForm(form, url) {
            if (this.isGenerating) {
                return;
            }

            this.isGenerating = true;
            this.generationLogs = [];
            this.generationStatus = 'running';
            this.streamedOutput = '';
            this.pushGenerationLog('已提交请求，等待服务端开始处理。');

            try {
                const formData = new FormData(form);
                const body = {};
                for (const [key, value] of formData.entries()) {
                    body[key] = value;
                }

                const response = await fetch(url, {
                    method: 'POST',
                    credentials: 'same-origin',
                    headers: {
                        'Accept': 'text/event-stream',
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': this.csrf(),
                        'X-Requested-With': 'XMLHttpRequest',
                    },
                    body: JSON.stringify(body),
                });

                if (!response.ok) {
                    const payload = await response.json().catch(() => ({}));
                    let message = payload.message;
                    if (!message && payload.errors && typeof payload.errors === 'object') {
                        const firstKey = Object.keys(payload.errors)[0];
                        const firstError = firstKey ? payload.errors[firstKey] : null;
                        if (Array.isArray(firstError) && firstError.length) {
                            message = firstError[0];
                        }
                    }
                    if (!message && response.status === 419) {
                        message = '页面已过期，请刷新页面后重试。';
                    }
                    throw new Error(message || ('HTTP ' + response.status));
                }

                await this.consumeEventStream(response);
            } catch (e) {
                this.generationStatus = 'error';
                this.pushGenerationLog(e.message || '生成失败。', 'error');
            } finally {
                this.isGenerating = false;
            }
        },

        async consumeEventStream(response) {
            if (!response.body) {
                throw new Error('当前浏览器不支持流式读取，请刷新后重试。');
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder('utf-8');
            let buffer = '';

            while (true) {
                const { value, done } = await reader.read();
                buffer += decoder.decode(value || new Uint8Array(), { stream: !done });

                let boundary = buffer.indexOf('\n\n');
                while (boundary >= 0) {
                    const rawEvent = buffer.slice(0, boundary);
                    buffer = buffer.slice(boundary + 2);
                    this.handleStreamEvent(rawEvent);
                    boundary = buffer.indexOf('\n\n');
                }

                if (done) {
                    if (buffer.trim()) {
                        this.handleStreamEvent(buffer);
                    }
                    break;
                }
            }
        },

        handleStreamEvent(rawEvent) {
            if (!rawEvent.trim()) {
                return;
            }

            const lines = rawEvent.split('\n');
            let eventName = 'message';
            const dataLines = [];

            for (const line of lines) {
                if (line.startsWith('event:')) {
                    eventName = line.slice(6).trim();
                } else if (line.startsWith('data:')) {
                    dataLines.push(line.slice(5).trim());
                }
            }

            let payload = {};
            const rawData = dataLines.join('\n');
            if (rawData) {
                try {
                    payload = JSON.parse(rawData);
                } catch (e) {
                    payload = { message: rawData };
                }
            }

            const message = payload.message || '';
            const level = payload.level || (eventName === 'error' ? 'error' : (eventName === 'done' ? 'success' : 'info'));
            if (eventName === 'chunk') {
                this.streamedOutput += message;
                if (payload.stream_total_chars) {
                    this.pushGenerationLog('流式生成中，已接收 ' + payload.stream_total_chars + ' 字符。', 'info', payload.timestamp || null);
                }
                return;
            }

            this.pushGenerationLog(message, level, payload.timestamp || null);

            if (eventName === 'done') {
                this.generationStatus = 'success';
                if (payload.refresh_preview) {
                    this.previewBust = Date.now();
                    this.loadVersions();
                    this.loadAnnotations();
                    return;
                }
                if (payload.redirect_url) {
                    window.location.href = payload.redirect_url;
                }
            }

            if (eventName === 'error') {
                this.generationStatus = 'error';
            }
        },

        pinLayoutStyle(a) {
            void this.iframeScrollVersion;
            const px = Number(a.x_percent);
            const py = Number(a.y_percent);
            const frame = this.$refs.demoFrame;
            if (! frame) {
                return 'left:' + px + '%;top:' + py + '%;';
            }
            const s0x = a.iframe_scroll_x;
            const s0y = a.iframe_scroll_y;
            if (s0x == null || s0y == null) {
                return 'left:' + px + '%;top:' + py + '%;';
            }
            try {
                const w = frame.contentWindow;
                const d = frame.contentDocument;
                if (! w || ! d) {
                    return 'left:' + px + '%;top:' + py + '%;';
                }
                const ch = frame.clientHeight || 1;
                const cw = frame.clientWidth || 1;
                const sNowY = w.scrollY ?? d.documentElement.scrollTop ?? d.body?.scrollTop ?? 0;
                const sNowX = w.scrollX ?? d.documentElement.scrollLeft ?? d.body?.scrollLeft ?? 0;
                const contentY = Number(s0y) + (py / 100) * ch;
                const contentX = Number(s0x) + (px / 100) * cw;
                const newPy = ((contentY - sNowY) / ch) * 100;
                const newPx = ((contentX - sNowX) / cw) * 100;
                return 'left:' + newPx + '%;top:' + newPy + '%;';
            } catch (e) {
                return 'left:' + px + '%;top:' + py + '%;';
            }
        },

        bindIframeScrollSync() {
            const frame = this.$refs.demoFrame;
            if (! frame) {
                return;
            }
            if (this._iframeScrollCleanup) {
                try {
                    this._iframeScrollCleanup();
                } catch (e) {}
                this._iframeScrollCleanup = null;
            }
            const bump = () => {
                this.iframeScrollVersion++;
            };
            const onLoad = () => {
                try {
                    const w = frame.contentWindow;
                    if (! w) {
                        return;
                    }
                    w.addEventListener('scroll', bump, { passive: true });
                    w.addEventListener('resize', bump);
                    this._iframeScrollCleanup = () => {
                        w.removeEventListener('scroll', bump);
                        w.removeEventListener('resize', bump);
                    };
                    bump();
                } catch (e) {}
            };
            try {
                if (frame.contentDocument && frame.contentDocument.readyState === 'complete') {
                    onLoad();
                } else {
                    frame.addEventListener('load', onLoad, { once: true });
                }
            } catch (e) {
                frame.addEventListener('load', onLoad, { once: true });
            }
        },

        init() {
            window.addEventListener('message', (e) => {
                const frame = this.$refs.demoFrame;
                if (!frame || e.source !== frame.contentWindow) return;
                const d = e.data;
                if (!d || typeof d !== 'object') return;
                const t = d.type;
                if (t !== 'DEMO_READY' && t !== 'DEMO_PAGE_CHANGE' && t !== 'DEMO_STATE_CHANGE' && t !== 'DEMO_ACTION') {
                    return;
                }
                if (typeof d.pageKey === 'string') {
                    this.pageKey = d.pageKey;
                }
                if (t === 'DEMO_STATE_CHANGE') {
                    this.stateKey = typeof d.stateKey === 'string' ? d.stateKey : '';
                }
                if (t === 'DEMO_READY' || t === 'DEMO_PAGE_CHANGE') {
                    this.stateKey = typeof d.stateKey === 'string' ? d.stateKey : '';
                    this.iframeScrollVersion++;
                    this.$nextTick(() => this.bindIframeScrollSync());
                }
                const time = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
                let line = time + ' ' + t;
                if (typeof d.pageKey === 'string') line += ' · ' + d.pageKey;
                if (typeof d.stateKey === 'string') line += ' · ' + d.stateKey;
                this.messages.unshift(line);
                if (this.messages.length > 6) this.messages.length = 6;
            });

            if (this.demoId) {
                this.loadAnnotations();
                this.loadVersions();
            }
            if (this.shouldAutoRefine && this.demoId) {
                this.clearAutoRefineFlagFromUrl();
                this.$nextTick(() => {
                    this.startDraftRefinement();
                });
            }
            this.$watch('demoId', (id) => {
                this.selectedId = null;
                this.expandedId = null;
                this.stateKey = '';
                this.annotations = [];
                this.versions = [];
                this.currentVersionId = null;
                if (id) {
                    this.loadAnnotations();
                    this.loadVersions();
                }
                this.$nextTick(() => this.bindIframeScrollSync());
            });
            this.$watch('previewBase', (v) => {
                if (v) {
                    this.$nextTick(() => this.bindIframeScrollSync());
                }
            });
            this.$watch('previewBust', () => {
                this.$nextTick(() => this.bindIframeScrollSync());
            });
            this.$nextTick(() => this.bindIframeScrollSync());
            window.addEventListener('resize', () => {
                this.iframeScrollVersion++;
            });
        },

        async startDraftRefinement() {
            if (this.isGenerating || !this.demoId) {
                return;
            }
            this.isGenerating = true;
            this.generationStatus = 'running';
            this.generationLogs = [];
            this.streamedOutput = '';
            this.pushGenerationLog('已进入预览，开始后台细化当前草稿。');

            try {
                const response = await fetch('/api/workbench/demos/' + this.demoId + '/refine-draft-stream', {
                    method: 'POST',
                    credentials: 'same-origin',
                    headers: {
                        'Accept': 'text/event-stream',
                        'X-CSRF-TOKEN': this.csrf(),
                        'X-Requested-With': 'XMLHttpRequest',
                    },
                });

                if (!response.ok) {
                    throw new Error('细化请求失败：HTTP ' + response.status);
                }

                await this.consumeEventStream(response);
            } catch (e) {
                this.generationStatus = 'error';
                this.pushGenerationLog(e.message || '细化失败。', 'error');
            } finally {
                this.isGenerating = false;
                this.shouldAutoRefine = false;
            }
        },

        async loadVersions() {
            if (!this.demoId) {
                return;
            }
            try {
                const j = await this.api('GET', '/api/demos/' + this.demoId + '/versions');
                this.versions = j.data || [];
                this.currentVersionId = j.current_version_id;
            } catch (e) {
                console.error(e);
            }
        },

        async restoreVersion(versionId) {
            if (!this.demoId) {
                return;
            }
            try {
                await this.api('POST', '/api/demos/' + this.demoId + '/versions/' + versionId + '/restore', {});
                await this.loadVersions();
                this.previewBust = Date.now();
            } catch (e) {
                alert('恢复失败：' + e.message);
            }
        },

        async reviseWithAi() {
            if (!this.selectedId) {
                return;
            }
            if (!confirm('将调用模型生成新版本，可能耗时较长。继续？')) {
                return;
            }
            try {
                await this.api('POST', '/api/annotations/' + this.selectedId + '/revise', {
                    user_instruction: this.revisionNote || null,
                });
                this.revisionNote = '';
                await this.loadAnnotations();
                await this.loadVersions();
                this.previewBust = Date.now();
                this.selectAnnotation(this.selectedId);
            } catch (e) {
                alert('AI 修改失败：' + e.message);
            }
        },

        async loadAnnotations() {
            if (!this.demoId) return;
            try {
                const j = await this.api('GET', '/api/demos/' + this.demoId + '/annotations?all=1');
                this.annotations = j.data || [];
            } catch (e) {
                console.error(e);
            }
        },

        filterAnnotations() {
            let list = this.annotations;
            if (this.listScope === 'current') {
                const pk = this.pageKey;
                if (pk && pk !== '—') {
                    list = list.filter((a) => a.page_key === pk);
                    if (this.stateKey) {
                        list = list.filter((a) => {
                            const stateKey = a.state_key || '';
                            return stateKey === '' || stateKey === this.stateKey;
                        });
                    } else {
                        list = list.filter((a) => !a.state_key);
                    }
                } else {
                    list = [];
                }
            }
            if (this.statusFilter) {
                list = list.filter((a) => a.status === this.statusFilter);
            }
            return list.slice();
        },

        sortAnnotationsById(list) {
            return list.slice().sort((a, b) => Number(a.id) - Number(b.id));
        },

        sortedPinsForCanvas() {
            return this.sortAnnotationsById(this.pinsForCanvas());
        },

        sortedListAnnotations() {
            return this.sortAnnotationsById(this.filterAnnotations());
        },

        selectedDisplayNum() {
            if (this.selectedId === null || this.selectedId === undefined || this.selectedId === '') {
                return '—';
            }
            const sid = Number(this.selectedId);
            const list = this.sortedListAnnotations();
            let idx = list.findIndex((x) => Number(x.id) === sid);
            if (idx >= 0) {
                return idx + 1;
            }
            const pins = this.sortedPinsForCanvas();
            idx = pins.findIndex((x) => Number(x.id) === sid);
            if (idx >= 0) {
                return idx + 1;
            }
            return '—';
        },

        pinsForCanvas() {
            const pk = this.pageKey;
            if (!pk || pk === '—') return [];
            let pagePins = this.annotations.filter((a) => a.page_key === pk);
            if (this.stateKey) {
                pagePins = pagePins.filter((a) => {
                    const stateKey = a.state_key || '';
                    return stateKey === '' || stateKey === this.stateKey;
                });
            } else {
                pagePins = pagePins.filter((a) => !a.state_key);
            }
            if (this.previewMode && !this.showPinsInPreview) {
                return [];
            }
            return pagePins;
        },

        async onCanvasClick(ev) {
            if (this.previewMode) return;
            const pk = this.pageKey;
            if (!pk || pk === '—') {
                alert('请先等待 Demo 上报 pageKey（在预览模式下切换一次页面）。');
                return;
            }
            const el = ev.currentTarget;
            const rect = el.getBoundingClientRect();
            const x = ((ev.clientX - rect.left) / rect.width) * 100;
            const y = ((ev.clientY - rect.top) / rect.height) * 100;
            let sx = 0;
            let sy = 0;
            try {
                const fr = this.$refs.demoFrame;
                const w = fr && fr.contentWindow;
                const d = fr && fr.contentDocument;
                if (w && d) {
                    sy = w.scrollY ?? d.documentElement.scrollTop ?? d.body?.scrollTop ?? 0;
                    sx = w.scrollX ?? d.documentElement.scrollLeft ?? d.body?.scrollLeft ?? 0;
                }
            } catch (err) {}
            try {
                await this.api('POST', '/api/demos/' + this.demoId + '/annotations', {
                    page_key: pk,
                    state_key: this.stateKey || null,
                    x_percent: Math.round(x * 10000) / 10000,
                    y_percent: Math.round(y * 10000) / 10000,
                    iframe_scroll_x: Math.round(sx * 100) / 100,
                    iframe_scroll_y: Math.round(sy * 100) / 100,
                    title: '新标注',
                });
                await this.loadAnnotations();
                this.selectedId = null;
            } catch (e) {
                alert('创建失败：' + e.message);
            }
        },

        selectAnnotation(id) {
            const a = this.annotations.find((x) => Number(x.id) === Number(id));
            if (!a) return;
            this.selectedId = Number(id);
            this.editForm = {
                title: a.title || '',
                description: a.description || '',
                type: a.type || '说明',
                status: a.status || '未处理',
            };
            this.$nextTick(() => {
                const el = document.getElementById('wb-pin-' + id);
                if (el && typeof el.scrollIntoView === 'function') {
                    el.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
                }
            });
        },

        toggleAnnotation(id) {
            const nextId = Number(id);
            if (this.expandedId === nextId) {
                this.expandedId = null;
                this.selectedId = null;
                this.uiHint = '';
                this.revisionNote = '';
                return;
            }

            this.expandedId = nextId;
            this.selectAnnotation(nextId);
        },

        async saveAnnotation() {
            if (!this.selectedId) {
                alert('请先选择一条标注（点 pin 或列表项）。');
                return;
            }
            this.uiHint = '保存中…';
            try {
                await this.api('PATCH', '/api/annotations/' + this.selectedId, {
                    title: this.editForm.title,
                    description: this.editForm.description || null,
                    type: this.editForm.type,
                    status: this.editForm.status,
                });
                await this.loadAnnotations();
                this.selectAnnotation(this.selectedId);
                this.uiHint = '已保存';
                setTimeout(() => {
                    if (this.uiHint === '已保存') {
                        this.uiHint = '';
                    }
                }, 2500);
            } catch (e) {
                this.uiHint = '';
                alert('保存失败：' + e.message);
            }
        },

        async deleteAnnotation() {
            if (!this.selectedId) return;
            if (!confirm('确定删除该标注？')) return;
            try {
                await this.api('DELETE', '/api/annotations/' + this.selectedId);
                this.selectedId = null;
                this.expandedId = null;
                await this.loadAnnotations();
            } catch (e) {
                alert('删除失败：' + e.message);
            }
        },
    };
}
</script>
@endpush
