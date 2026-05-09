import React from "react";
import { motion } from "framer-motion";

const Icon = ({ children, className = "" }) => (
  <span className={`inline-flex items-center justify-center ${className}`}>{children}</span>
);

const Bot = ({ className = "" }) => <Icon className={className}>AI</Icon>;
const Layers = ({ className = "" }) => <Icon className={className}>▦</Icon>;
const Database = ({ className = "" }) => <Icon className={className}>◉</Icon>;
const Workflow = ({ className = "" }) => <Icon className={className}>↔</Icon>;
const Mail = ({ className = "" }) => <Icon className={className}>@</Icon>;
const Phone = ({ className = "" }) => <Icon className={className}>☎</Icon>;
const Download = ({ className = "" }) => <Icon className={className}>↓</Icon>;
const CheckCircle2 = ({ className = "" }) => <Icon className={className}>✓</Icon>;

const projects = [
  {
    title: "自然拼读英语",
    tag: "AI 教育产品",
    desc: "面向儿童英语启蒙，通过自然拼读规则、单词拆分、AI语音与学习路径设计，降低英语发音学习门槛。",
    highlights: ["自然拼读逻辑", "AI语音发音", "单词拆分", "儿童学习路径"],
    outcomes: ["聚焦儿童启蒙场景", "降低发音学习门槛", "形成可迭代的学习体验框架"],
    caseStudy: {
      userProblem: "儿童英语启蒙中，发音规则抽象、家长陪学成本高，容易中途放弃。",
      productGoal: "用轻量产品形态降低自然拼读学习门槛，优先验证孩子能否持续学习。",
      coreDesign: "围绕字母组合规则、单词拆分、分级任务和反馈机制设计学习闭环。",
      aiInvolvement: "通过 AI 语音评测和辅助讲解提升发音纠偏效率，减少人工陪练依赖。",
      productTradeoff: "MVP 阶段先做核心拼读训练与反馈，不扩展复杂社交和游戏化体系。",
      mvpDecision: "优先验证学习闭环效果与留存表现，再逐步扩展素材库和个性化路径。",
      result: "形成可复用的儿童英语启蒙产品框架，为后续迭代提供清晰方向。",
    },
    actionType: "qr",
    actionLabel: "小程序二维码占位",
  },
  {
    title: "英语小故事",
    tag: "沉浸式英语输入产品",
    desc: "通过 AI 朗读、点词翻译、生词本、分级阅读和绘本风格内容，打造轻量但完整的儿童英语阅读体验。",
    highlights: ["AI朗读", "点词翻译", "生词本", "AI故事生成"],
    outcomes: ["强化沉浸式英语输入", "兼顾阅读理解与词汇积累", "支持内容快速迭代生产"],
    caseStudy: {
      userProblem: "儿童英语阅读存在理解门槛，内容难度不匹配且缺乏持续输入动力。",
      productGoal: "提供更轻量、可持续的英语阅读入口，提升理解效率与阅读兴趣。",
      coreDesign: "构建分级故事、点词翻译、生词本复习和阅读进度管理的完整路径。",
      aiInvolvement: "利用 AI 朗读、内容生成和表达优化，提高内容产能与个性化体验。",
      productTradeoff: "优先保证阅读流程顺畅和可理解性，暂缓复杂社群互动功能。",
      mvpDecision: "先验证核心阅读功能与复习闭环，再补充更多题型和互动模块。",
      result: "形成沉浸式输入模型，兼顾儿童可读性与产品迭代效率。",
    },
    actionType: "qr",
    actionLabel: "小程序二维码占位",
  },
  {
    title: "CRM AI 项目",
    tag: "企业 AI 工作流系统",
    desc: "围绕企业流程、数据流和工作流自动化，展示 B 端复杂系统设计与 AI 落地能力。",
    highlights: ["工作流系统", "AI自动化", "业务流程", "系统架构"],
    outcomes: ["凸显企业级复杂系统能力", "沉淀流程自动化方法", "支撑业务协同效率提升"],
    caseStudy: {
      userProblem: "企业流程跨部门、跨角色协同复杂，数据断层导致执行效率与透明度不足。",
      productGoal: "搭建可配置工作流系统，打通业务流程与数据流，提升组织协同效率。",
      coreDesign: "围绕流程编排、状态管理、节点权限和异常处理构建企业级系统架构。",
      aiInvolvement: "在关键节点接入 AI 自动化能力，辅助信息处理、规则匹配与流程推进。",
      productTradeoff: "优先保障稳定性、可追踪性和可配置能力，延后低频高级扩展模块。",
      mvpDecision: "先完成关键业务链路数字化与自动化，再逐步扩展跨系统集成能力。",
      result: "形成可落地的企业 AI 工作流方案，突出 B 端系统化产品设计能力。",
    },
    actionType: "link",
    actionLabel: "项目链接占位",
  },
];

const caseStudy = ["用户问题", "产品目标", "核心设计", "AI参与方式", "产品思考", "MVP取舍", "项目结果"];

const skills = [
  { icon: Bot, title: "AI 产品能力", items: ["RAG 知识库", "意图识别", "多轮对话", "Prompt Engineering"] },
  { icon: Layers, title: "产品设计能力", items: ["MVP规划", "系统设计", "用户体验", "B端产品"] },
  { icon: Database, title: "数据产品能力", items: ["指标体系", "埋点方案", "BI看板", "数据仓库"] },
  { icon: Workflow, title: "研发协作能力", items: ["API设计", "前后端协作", "项目推进", "AI协同开发"] },
];

const impactMetrics = [
  { value: "8年+", label: "B端产品经验" },
  { value: "45% → 28%", label: "智能客服转人工率优化" },
  { value: "95%", label: "RAG知识覆盖率" },
  { value: "40%+", label: "订单处理效率提升" },
];

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: "easeOut" } },
};

function validateDemoData() {
  const expectedProjectCount = 3;
  const qrProjectCount = projects.filter((project) => project.actionType === "qr").length;
  const linkProjectCount = projects.filter((project) => project.actionType === "link").length;

  console.assert(projects.length === expectedProjectCount, "Demo should include 3 portfolio projects.");
  console.assert(qrProjectCount === 2, "自然拼读英语和英语小故事应保留二维码占位。");
  console.assert(linkProjectCount === 1, "CRM AI 项目应保留链接占位。");
  console.assert(skills.length === 4, "Demo should include 4 skill groups.");
}

validateDemoData();

export default function PortfolioDemo() {
  const caseStudyFields = [
    { key: "userProblem", label: "用户问题" },
    { key: "productGoal", label: "产品目标" },
    { key: "coreDesign", label: "核心设计" },
    { key: "aiInvolvement", label: "AI参与方式" },
    { key: "productTradeoff", label: "产品思考" },
    { key: "mvpDecision", label: "MVP取舍" },
    { key: "result", label: "项目结果" },
  ];

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f8f6f1] text-[#1f2933] [scroll-behavior:smooth]">
      <section className="relative min-h-screen px-6 py-8 md:px-12 lg:px-20">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-32 right-20 h-[360px] w-[360px] rounded-full bg-[#e8d8c8]/50 blur-3xl" />
          <div className="absolute bottom-20 left-1/3 h-[300px] w-[300px] rounded-full bg-white/80 blur-3xl" />
        </div>

        <nav className="relative z-10 mx-auto flex max-w-7xl items-center justify-between border-b border-[#d8cabe] pb-5 text-[#a47463]">
          <div className="text-sm font-semibold tracking-[0.25em]">AI PRODUCT BUILDER</div>
          <div className="hidden items-center gap-8 text-sm md:flex">
            <a href="#projects" className="hover:text-[#6f473b]">Projects</a>
            <a href="#case-study-details" className="hover:text-[#6f473b]">Case Study</a>
            <a href="#skills" className="hover:text-[#6f473b]">Skills</a>
            <a href="#about" className="hover:text-[#6f473b]">About</a>
            <a href="#contact" className="hover:text-[#6f473b]">Contact</a>
          </div>
        </nav>

        <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-12 py-16 lg:grid-cols-[0.9fr_1.1fr] lg:py-20">
          <motion.div initial="hidden" animate="show" variants={fadeUp}>
            <h1 className="font-serif text-[72px] font-semibold leading-[0.95] tracking-[-0.06em] text-[#a47463] sm:text-[96px] lg:text-[112px]">
              林凤
            </h1>
            <p className="mt-6 text-sm font-semibold uppercase tracking-[0.42em] text-[#a47463]/80">
              AI Product Builder
            </p>
            <div className="mt-16 max-w-xl text-3xl font-semibold leading-snug tracking-[-0.04em] text-[#a47463] md:text-4xl">
              8年B端产品经验<br />AI产品落地<br />数据产品思维
            </div>
            <p className="mt-8 max-w-xl text-base leading-8 text-[#8c675a]">
              AI 产品经理 + AI 独立开发者。擅长将复杂业务逻辑抽象为可落地的系统产品，覆盖 AI 智能体、RAG 知识库、多轮对话、B端供应链、电商交易与数据产品建设。
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <a href="#projects" className="inline-flex h-12 items-center justify-center rounded-full bg-[#a47463] px-7 text-sm font-semibold text-white shadow-lg shadow-[#a47463]/20 transition hover:-translate-y-0.5">查看作品</a>
              <a href="#contact" className="inline-flex h-12 items-center justify-center rounded-full border border-[#cbb5a8] px-7 text-sm font-semibold text-[#a47463] transition hover:-translate-y-0.5 hover:bg-white/60">联系我</a>
              <a href="#contact" className="inline-flex h-12 items-center justify-center rounded-full border border-[#cbb5a8] bg-white/70 px-7 text-sm font-semibold text-[#a47463] transition hover:-translate-y-0.5 hover:bg-white">下载简历</a>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="grid gap-6 md:grid-cols-[1fr_0.82fr]">
            <div className="relative flex min-h-[520px] items-center justify-center">
              <div className="relative h-[520px] w-[360px] overflow-hidden rounded-t-[12rem] rounded-b-[2rem] bg-[#f5efe7] shadow-2xl shadow-[#a47463]/10">
                <img
                  src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=1200&auto=format&fit=crop"
                  alt="Portfolio placeholder"
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#6f473b]/30 via-transparent to-white/10" />
                <div className="absolute bottom-6 left-6 right-6 rounded-[1.6rem] border border-white/40 bg-white/72 p-5 shadow-lg backdrop-blur-md">
                  <p className="text-sm font-medium text-[#a47463]/70">AI Product Builder Portfolio</p>
                  <p className="mt-2 text-sm leading-6 text-[#8c675a]">首页主视觉图片区（后续替换为个人职业照）</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-6">
              <div className="rounded-[2rem] border border-[#e1d3c8] bg-white/55 p-6 text-[#a47463] shadow-lg shadow-[#a47463]/5 backdrop-blur-xl">
                <div className="space-y-5 text-base leading-7">
                  <p className="flex gap-4"><span>→</span><span>1546529912@qq.com</span></p>
                  <p className="flex gap-4"><span>→</span><span>18503051130</span></p>
                  <p className="flex gap-4"><span>→</span><span>AI产品 / 教育产品 / B端系统</span></p>
                </div>
              </div>

              <div className="rounded-[2rem] bg-[#dac7b8] p-5 shadow-xl shadow-[#a47463]/10">
                <div className="rounded-[1.5rem] bg-[#f7f1ea] p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#a47463]/70">Selected Work</p>
                  <div className="mt-6 space-y-3">
                    {projects.map((item, index) => (
                      <a key={item.title} href="#projects" className="group flex items-center justify-between rounded-2xl bg-white/75 px-4 py-3 text-sm text-[#a47463] transition hover:-translate-y-0.5 hover:bg-white">
                        <span>{item.title}</span>
                        <span className="text-xs opacity-60">0{index + 1}</span>
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="px-6 pb-8 md:px-12 lg:px-20">
        <div className="mx-auto grid max-w-7xl gap-4 rounded-[2rem] border border-white/80 bg-white/60 p-6 shadow-sm backdrop-blur-xl md:grid-cols-2 lg:grid-cols-4">
          {impactMetrics.map((metric) => (
            <div key={metric.label} className="rounded-2xl border border-[#efe6dd] bg-[#fbf9f5] p-4">
              <p className="text-2xl font-semibold tracking-[-0.02em] text-[#8c675a]">{metric.value}</p>
              <p className="mt-1 text-sm text-gray-500">{metric.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="projects" className="px-6 py-24 md:px-12 lg:px-20">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 max-w-3xl">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-gray-400">Projects</p>
            <h2 className="text-4xl font-semibold tracking-[-0.03em] md:text-5xl">不是普通截图展示，而是 Case Study 风格作品集</h2>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {projects.map((project) => (
              <motion.article whileHover={{ y: -8 }} key={project.title} className="rounded-[2rem] border border-white bg-white/70 p-7 shadow-sm backdrop-blur-xl transition">
                <div className="mb-5 inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-500">{project.tag}</div>
                <h3 className="text-2xl font-semibold tracking-[-0.02em]">{project.title}</h3>
                <p className="mt-4 min-h-28 text-sm leading-7 text-gray-600">{project.desc}</p>
                <div className="mt-6 flex flex-wrap gap-2">
                  {project.highlights.map((highlight) => (
                    <span key={highlight} className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs text-gray-500">{highlight}</span>
                  ))}
                </div>

                {project.actionType === "qr" ? (
                  <div className="mt-8 flex items-center justify-between rounded-3xl border border-[#e5d9cf] bg-[#faf8f4] px-5 py-4">
                    <div>
                      <p className="text-sm font-medium text-[#8c675a]">{project.actionLabel}</p>
                      <p className="mt-1 text-xs text-gray-400">后续替换为微信小程序二维码</p>
                    </div>
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-dashed border-[#cbb5a8] bg-white text-xl text-[#a47463] shadow-sm">▦</div>
                  </div>
                ) : (
                  <div className="mt-8 rounded-3xl border-2 border-dashed border-[#d8cabe] bg-[#f8f6f1] p-5">
                    <p className="text-sm font-medium text-[#8c675a]">{project.actionLabel}</p>
                    <a
                      href="https://your-crm-demo-link.com"
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 block rounded-2xl bg-white px-4 py-3 text-sm text-gray-400 shadow-sm transition hover:text-[#8c675a]"
                    >
                      https://your-crm-demo-link.com
                    </a>
                    <p className="mt-2 text-xs text-gray-400">后续替换为 CRM Demo 链接 / GitHub / 在线预览地址</p>
                  </div>
                )}
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      <section id="case-study-details" className="px-6 py-24 md:px-12 lg:px-20">
        <div className="mx-auto max-w-7xl rounded-[2.5rem] bg-[#111827] p-8 text-white md:p-12">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-white/40">Case Study</p>
              <h2 className="text-4xl font-semibold tracking-[-0.03em]">统一的产品思考表达结构</h2>
              <p className="mt-5 leading-7 text-white/60">每个项目都从问题、目标、设计、AI参与方式、MVP取舍和结果展开，突出产品经理的结构化能力。</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {caseStudy.map((item) => (
                <div key={item} className="rounded-3xl border border-white/10 bg-white/5 p-5">
                  <CheckCircle2 className="mb-4 h-5 w-5 text-emerald-300" />
                  <p className="font-medium">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 py-24 md:px-12 lg:px-20">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 max-w-3xl">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-gray-400">Project Case Study</p>
            <h2 className="text-4xl font-semibold tracking-[-0.03em] md:text-5xl">每个项目都采用统一的产品分析结构</h2>
          </div>
          <div className="space-y-8">
            {projects.map((project) => (
              <motion.article
                key={`${project.title}-case`}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.7, ease: "easeOut" }}
                className="rounded-[2rem] border border-white bg-white/70 p-8 shadow-sm backdrop-blur-xl"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <span className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-500">{project.tag}</span>
                  <h3 className="text-2xl font-semibold tracking-[-0.02em] text-[#1f2933]">{project.title}</h3>
                </div>
                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  {caseStudyFields.map((field) => (
                    <div key={`${project.title}-${field.key}`} className="rounded-2xl border border-[#ece7e2] bg-[#fcfbf8] p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#a47463]/70">{field.label}</p>
                      <p className="mt-2 text-sm leading-7 text-gray-600">{project.caseStudy[field.key]}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-6 flex flex-wrap gap-2">
                  {project.outcomes.map((outcome) => (
                    <span key={`${project.title}-${outcome}`} className="rounded-full border border-[#e5d9cf] bg-white px-3 py-1 text-xs text-[#8c675a]">
                      {outcome}
                    </span>
                  ))}
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      <section id="skills" className="px-6 py-24 md:px-12 lg:px-20">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 max-w-3xl">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-gray-400">Skills</p>
            <h2 className="text-4xl font-semibold tracking-[-0.03em] md:text-5xl">AI、产品、数据、研发协作的复合能力</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {skills.map((skill) => {
              const SkillIcon = skill.icon;
              return (
                <div key={skill.title} className="rounded-[2rem] border border-white bg-white/70 p-6 shadow-sm backdrop-blur-xl">
                  <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100"><SkillIcon className="h-5 w-5" /></div>
                  <h3 className="font-semibold">{skill.title}</h3>
                  <ul className="mt-4 space-y-2 text-sm text-gray-600">
                    {skill.items.map((item) => <li key={item}>· {item}</li>)}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section id="about" className="px-6 py-24 md:px-12 lg:px-20">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-gray-400">About</p>
            <h2 className="text-4xl font-semibold tracking-[-0.03em] md:text-5xl">从传统 B 端产品，到 AI 产品探索，再到 AI 独立开发</h2>
          </div>
          <div className="rounded-[2rem] border border-white bg-white/70 p-8 leading-8 text-gray-600 shadow-sm backdrop-blur-xl">
            <p>拥有 8 年 B 端产品经验，曾主导 AI 电商智能客服、大数据用户画像与精准推荐系统、全渠道电商与供应链一体化平台等项目。</p>
            <p className="mt-5">当前关注 AI Agent、AI 教育、AI 工作流和 AI 产品 MVP，希望用更轻量的方式把真实业务问题做成可落地的 AI 产品。</p>
            <p className="mt-5">产品理念是以系统化思维定义边界、以 MVP 方法验证价值、以可落地能力推动业务持续迭代。</p>
          </div>
        </div>
      </section>

      <section id="contact" className="px-6 pb-24 md:px-12 lg:px-20">
        <div className="mx-auto max-w-7xl rounded-[2.5rem] border border-white bg-white/70 p-8 shadow-sm backdrop-blur-xl md:p-12">
          <div className="grid items-center gap-8 lg:grid-cols-[1fr_auto]">
            <div>
              <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-gray-400">Contact</p>
              <h2 className="text-4xl font-semibold tracking-[-0.03em]">欢迎交流 AI 产品、教育产品与 B 端系统合作</h2>
            </div>
            <div className="space-y-3 text-sm text-gray-600">
              <a href="mailto:1546529912@qq.com" className="flex items-center gap-3 hover:text-[#8c675a]"><Mail className="h-4 w-4" />1546529912@qq.com</a>
              <a href="tel:18503051130" className="flex items-center gap-3 hover:text-[#8c675a]"><Phone className="h-4 w-4" />18503051130</a>
              <p className="flex items-center gap-3"><span className="inline-flex h-4 w-4 items-center justify-center text-xs">微</span>微信：linfeng-ai（占位）</p>
              <a href="https://github.com/linfeng-ai" target="_blank" rel="noreferrer" className="flex items-center gap-3 hover:text-[#8c675a]"><span className="inline-flex h-4 w-4 items-center justify-center text-xs">G</span>GitHub：github.com/linfeng-ai（占位）</a>
              <button type="button" className="mt-3 inline-flex h-12 items-center gap-2 rounded-2xl bg-[#111827] px-5 text-sm font-medium text-white">
                <Download className="h-4 w-4" /> 下载简历
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
