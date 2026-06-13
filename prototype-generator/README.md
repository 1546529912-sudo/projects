# 原型生成器 · DeepSeek

把 [prototype-html](https://github.com/vagerent/prototype-html) skill 改造成的 Web 工具：输入自然语言需求，DeepSeek 生成可直接运行的单文件 HTML 产品原型。

## 跑起来（3 步）

```bash
# 1. 装依赖
npm install

# 2. 配置 API Key
cp .env.local.example .env.local
# 编辑 .env.local，把 sk-xxx 替换为你的真实 DeepSeek API Key
# 申请：https://platform.deepseek.com/api_keys

# 3. 启动
npm run dev
# 打开 http://localhost:3000
```

## 怎么用

1. 在左侧输入框描述你想要的原型（越具体越好）
2. 选模型（`deepseek-chat` 快，`deepseek-reasoner` 慢但更细）
3. 点「生成原型」，右侧 iframe 实时预览
4. 完成后可以：复制代码 / 下载 HTML / 新标签页打开

## 项目结构

```
prototype-generator/
├── app/
│   ├── api/generate/route.ts   # 调 DeepSeek 的流式 API
│   ├── page.tsx                # 主页面（左输入 + 右预览）
│   ├── layout.tsx
│   └── globals.css
├── lib/
│   ├── prompt.ts               # 拼装 system prompt
│   └── prompts/
│       ├── SKILL.md            # 来自 prototype-html skill
│       └── example.html        # 风格参考
├── package.json
└── .env.local.example
```

## 改 prompt 让生成效果更符合你的偏好

- 改 `lib/prompts/SKILL.md`：调整规范、配色、布局比例等约束
- 替换 `lib/prompts/example.html`：换成你最满意的一份原型当模板，新生成的会模仿它
- 改 `lib/prompt.ts`：调整 system prompt 的整体结构

## 部署到 Vercel

```bash
# 安装 vercel CLI
npm i -g vercel

# 部署
vercel

# 在 Vercel 控制台或 CLI 里加环境变量 DEEPSEEK_API_KEY
vercel env add DEEPSEEK_API_KEY
```

## 注意

- API Key 是付费资源，**不要提交到 git**（`.env.local` 已在 `.gitignore`）
- 流式输出会消耗 token，长原型一次大约 4k-8k token，按 DeepSeek 价格计算几分钱到几毛钱
- `deepseek-reasoner` 比 `deepseek-chat` 贵且慢，但输出结构通常更稳定
