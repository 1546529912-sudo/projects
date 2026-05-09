"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import GooeyNav from "@/components/GooeyNav";
import { PortfolioChat } from "@/components/PortfolioChat";

const Icon = ({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => <span className={`inline-flex items-center justify-center ${className}`}>{children}</span>;

const Bot = ({ className = "" }: { className?: string }) => <Icon className={className}>AI</Icon>;
const Layers = ({ className = "" }: { className?: string }) => <Icon className={className}>▦</Icon>;
const Database = ({ className = "" }: { className?: string }) => <Icon className={className}>◉</Icon>;
const Workflow = ({ className = "" }: { className?: string }) => <Icon className={className}>↔</Icon>;
const Mail = ({ className = "" }: { className?: string }) => <Icon className={className}>@</Icon>;
const Phone = ({ className = "" }: { className?: string }) => <Icon className={className}>☎</Icon>;
const WeChat = ({ className = "" }: { className?: string }) => <Icon className={className}>微</Icon>;
const CheckCircle2 = ({ className = "" }: { className?: string }) => <Icon className={className}>✓</Icon>;

type Project = {
  id: string;
  title: string;
  tag: string;
  desc: string;
  highlights: string[];
  outcomes: string[];
  caseStudy: {
    userProblem: string;
    productGoal: string;
    coreDesign: string;
    aiInvolvement: string;
    productTradeoff: string;
    mvpDecision: string;
    result: string;
  };
  actionType: "qr" | "link";
  actionLabel: string;
};

const projects: Project[] = [
  {
    id: "story",
    title: "英语小故事",
    tag: "个人项目 · 内容产品实践",
    desc: "围绕英语阅读体验展开的个人产品实践，通过 AI 朗读、点词翻译、生词本与内容生成，探索更轻量的阅读产品形态。",
    highlights: ["AI朗读", "点词翻译", "生词本", "AI故事生成"],
    outcomes: ["强化沉浸式英语输入", "兼顾阅读理解与词汇积累", "支持内容快速迭代生产"],
    caseStudy: {
      userProblem: "英语阅读存在理解门槛，内容难度不匹配且缺乏持续输入动力。",
      productGoal: "以更轻量的个人内容产品形态验证阅读闭环，兼顾理解与进阶。",
      coreDesign: "构建分级故事、点词翻译、生词本复习和阅读进度管理的完整路径。",
      aiInvolvement: "利用 AI 朗读、内容生成和表达优化，提高内容产能与个性化体验。",
      productTradeoff: "优先保证阅读流程顺畅和可理解性，暂缓复杂社群互动功能。",
      mvpDecision: "先验证核心阅读功能与复习闭环，再补充更多题型和互动模块。",
      result: "形成可迭代的沉浸式输入模型，作为个人侧的探索载体。",
    },
    actionType: "qr",
    actionLabel: "微信小程序体验码",
  },
  {
    id: "crm",
    title: "CRM AI 实践",
    tag: "产品方案实践 · 流程与 AI",
    desc: "面向企业流程场景的产品方案实践：围绕工作流、数据流和 AI 自动化，探索复杂 B 端系统与 AI 落地的结合可能性。",
    highlights: ["工作流", "AI自动化触点", "数据流梳理", "可配置架构"],
    outcomes: ["方法论沉淀", "方案级叙事与原型验证", "为真实场景推演决策"],
    caseStudy: {
      userProblem: "企业流程跨部门、跨角色协同复杂，数据断层导致效率与可追溯性不足。",
      productGoal: "以方案实践推演可配置的流程与工作流骨架，对齐业务与数据的衔接方式。",
      coreDesign: "围绕编排、状态管理、权限与异常路径搭建可扩展的系统结构示意。",
      aiInvolvement: "在关键节点引入 AI 自动化假设，梳理规则匹配与人类兜底边界。",
      productTradeoff: "优先厘清主线链路与可追溯性；复杂插件与长尾集成留给后续推演。",
      mvpDecision: "先闭环「流程—数据—自动化」示意，再按场景增补跨系统触点。",
      result: "形成个人主导的方案级实践叙事，区别于已大规模商用的企业交付表述。",
    },
    actionType: "link",
    actionLabel: "方案与实践说明（演示）",
  },
];

type EnterpriseProject = {
  title: string;
  summary: string;
  keywords: string[];
};

const enterpriseProjects: EnterpriseProject[] = [
  {
    title: "AI 电商智能客服",
    summary:
      "从 0 到 1 设计并落地 AI 智能客服产品，覆盖查单、改地址、退换货等高频场景。",
    keywords: ["RAG", "意图识别", "多轮对话", "转人工兜底"],
  },
  {
    title: "数据平台",
    summary: "负责大数据用户画像与精准推荐系统建设，统一指标体系、埋点方案与 BI 看板。",
    keywords: ["指标体系", "标签体系", "埋点", "BI"],
  },
  {
    title: "电商平台系统",
    summary: "参与电商交易链路建设，涵盖商品、订单、营销、售后等核心模块。",
    keywords: ["商品中心", "订单系统", "售后闭环"],
  },
  {
    title: "供应链系统",
    summary: "推进合同驱动型供应链闭环设计，打通合同、订单、物流、资金全链路。",
    keywords: ["履约", "审批流", "状态机", "工作流引擎"],
  },
  {
    title: "其他功能模块系统",
    summary: "参与多套企业侧功能模块从需求梳理到上线的协同推进。",
    keywords: ["模块化", "迭代交付", "跨团队协作"],
  },
];

const caseStudy = ["用户问题", "产品目标", "核心设计", "AI参与方式", "产品思考", "MVP取舍", "项目结果"];

const skills = [
  { icon: Bot, title: "AI 产品能力", items: ["RAG 知识库设计", "意图识别与多轮对话", "Prompt Engineering", "bad case 复盘与效果优化"] },
  { icon: Layers, title: "产品设计能力", items: ["MVP规划", "复杂业务抽象", "B端系统设计", "企业平台从0到1建设"] },
  { icon: Database, title: "数据产品能力", items: ["指标体系设计", "埋点方案", "BI看板", "ODS / DWD / DWS / ADS 分层认知"] },
  { icon: Workflow, title: "研发协作能力", items: ["API接口理解", "前后端协作", "跨团队项目推进", "PMP项目管理"] },
];

const aboutParagraphs = [
  "我拥有 8 年 B 端产品经验，长期在通信行业，构建电商、供应链和数据产品场景，推进企业级系统建设，主导或参与过 AI 电商智能客服、数据平台、电商平台系统、供应链系统等项目。",
  "在职业项目之外，我也持续进行个人项目与 AI 产品实践，例如英语小故事与 CRM AI 实践，用于探索 AI 在内容产品、业务流程与系统方案中的实际落地方式。",
];

const heroProjects = [
  { id: "crm", label: "CRM系统", target: "crm" },
  { id: "story", label: "英语小故事", target: "story" },
];

const navItems = [
  { label: "Home", href: "#home" },
  { label: "当前项目", href: "#projects" },
  { label: "企业经验", href: "#enterprise" },
  { label: "案例研究", href: "#case-study-details" },
  { label: "核心能力", href: "#skills" },
  { label: "关于我", href: "#about" },
  { label: "联系", href: "#contact" },
];

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as const },
  },
};

/** 置顶导航为 fixed，锚点落在眉题上并预留 scroll-margin，避免文字被遮住 */
const navAnchorClass =
  "scroll-mt-[6.75rem] md:scroll-mt-[8.875rem] outline-none";

export function ApprovedPortfolioPage() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeNavIndex, setActiveNavIndex] = useState(0);
  const [showDevModal, setShowDevModal] = useState(false);
  /** 顶部 Tab 点击后短暂暂停 scroll-spy：避免平滑滚过中段时高亮乱跳 */
  const navSpyPausedUntilRef = useRef(0);

  const applyScrollSpy = useCallback(() => {
    const sectionIds = navItems.map((item) => item.href.replace("#", ""));
    const scrollY =
      typeof window.scrollY === "number" ? window.scrollY : window.pageYOffset ?? document.documentElement.scrollTop;
    if (Date.now() < navSpyPausedUntilRef.current) return;
    /** 对齐固定导航 + 眉题 scroll-mt */
    const activationOffset = window.matchMedia("(min-width: 768px)").matches ? 148 : 128;
    const targetLine = scrollY + activationOffset;
    let matchedIndex = 0;

    for (let i = 0; i < sectionIds.length; i += 1) {
      const sectionEl = document.getElementById(sectionIds[i]);
      if (!sectionEl) continue;
      const sectionTop = sectionEl.getBoundingClientRect().top + scrollY;
      if (sectionTop <= targetLine) {
        matchedIndex = i;
      }
    }

    setActiveNavIndex((prev) => (prev !== matchedIndex ? matchedIndex : prev));
  }, []);

  const handleTopNavNavigate = useCallback(
    (index: number, href: string) => {
      navSpyPausedUntilRef.current = Date.now() + 840;
      setActiveNavIndex(index);
      window.requestAnimationFrame(() => {
        if (href === "#home") {
          window.scrollTo({ top: 0, behavior: "smooth" });
          return;
        }
        const id = href.replace("#", "");
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
      window.setTimeout(() => {
        navSpyPausedUntilRef.current = 0;
        window.requestAnimationFrame(applyScrollSpy);
      }, 860);
    },
    [applyScrollSpy],
  );
  const [hoveredProjectId, setHoveredProjectId] = useState<string | null>(null);
  /** 首页点进某项目后：Projects 区卡片保持强调 */
  const [pickedProjectId, setPickedProjectId] = useState<string | null>(null);
  const caseStudyFields: Array<{
    key: keyof Project["caseStudy"];
    label: string;
  }> = [
    { key: "userProblem", label: "用户问题" },
    { key: "productGoal", label: "产品目标" },
    { key: "coreDesign", label: "核心设计" },
    { key: "aiInvolvement", label: "AI参与方式" },
    { key: "productTradeoff", label: "产品思考" },
    { key: "mvpDecision", label: "MVP取舍" },
    { key: "result", label: "项目结果" },
  ];

  const emphasisProjectId = hoveredProjectId ?? pickedProjectId;

  const jumpToProject = (projectId: string) => {
    setPickedProjectId(projectId);
    navSpyPausedUntilRef.current = Date.now() + 840;
    setActiveNavIndex(1);
    window.requestAnimationFrame(() => {
      const el = document.getElementById(`project-${projectId}`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    window.setTimeout(() => {
      navSpyPausedUntilRef.current = 0;
      window.requestAnimationFrame(applyScrollSpy);
    }, 860);
  };

  /** 刷新/首次进入始终在首页顶栏对齐，不因 URL hash 卡在中间段落 */
  useLayoutEffect(() => {
    const { pathname, search, hash } = window.location;
    if (hash) {
      window.history.replaceState(null, "", `${pathname}${search}`);
    }
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    setActiveNavIndex(0);
  }, []);

  useEffect(() => {
    const handleScrollState = () => {
      setIsScrolled(window.scrollY > 12);
    };

    handleScrollState();
    window.addEventListener("scroll", handleScrollState, { passive: true });

    const rafUpdate = () => window.requestAnimationFrame(applyScrollSpy);

    rafUpdate();
    window.addEventListener("scroll", rafUpdate, { passive: true });
    window.addEventListener("resize", rafUpdate);
    return () => {
      window.removeEventListener("scroll", handleScrollState);
      window.removeEventListener("scroll", rafUpdate);
      window.removeEventListener("resize", rafUpdate);
    };
  }, [applyScrollSpy]);

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f8f6f1] text-[#1f2933]">
      <section id="home" className="relative min-h-screen px-8 pb-8 pt-24 md:px-12 md:pt-28 lg:px-20">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-32 right-20 h-[360px] w-[360px] rounded-full bg-[#e8d8c8]/50 blur-3xl" />
          <div className="absolute bottom-20 left-1/3 h-[300px] w-[300px] rounded-full bg-white/80 blur-3xl" />
        </div>

        <nav
          className={`fixed left-0 right-0 top-0 z-40 px-8 py-5 text-[#a47463] transition-all duration-300 md:px-12 lg:px-20 ${
            isScrolled
              ? "border-b border-[#d8cabe] bg-[#f8f6f1]/80 backdrop-blur-md"
              : "border-b border-transparent bg-transparent"
          }`}
        >
          <div className="mx-auto flex max-w-[1360px] items-center justify-between">
            <div className="text-sm font-semibold tracking-[0.25em]">产品经理</div>
          <div className="hidden md:block">
            <GooeyNav
              items={navItems}
              activeIndex={activeNavIndex}
              particleCount={8}
              particleDistances={[36, 6]}
              particleR={38}
              initialActiveIndex={0}
              animationTime={560}
              timeVariance={90}
              colors={[1, 2, 3, 2, 3, 4, 1, 2]}
              onNavigate={handleTopNavNavigate}
            />
          </div>
          </div>
        </nav>

        <div className="relative z-10 mx-auto grid max-w-[1360px] items-center gap-10 py-12 lg:grid-cols-[0.9fr_0.62fr_0.42fr] lg:gap-8 lg:py-16">
          <motion.div initial="hidden" animate="show" variants={fadeUp} className="max-w-[700px]">
            <h1 className="font-serif text-[68px] font-semibold leading-[0.95] tracking-[-0.06em] text-[#a47463] sm:text-[88px] lg:text-[98px]">
              林凤
            </h1>
            <p className="mt-5 text-sm font-semibold uppercase tracking-[0.42em] text-[#a47463]/80">Product Builder / 产品经理</p>
            <div className="mt-12 max-w-[520px] text-3xl font-semibold leading-snug tracking-[-0.04em] text-[#a47463] md:text-4xl">
              企业级系统建设<br />
              AI 产品 · 个人实践
            </div>
            <p className="mt-7 max-w-[560px] text-base leading-8 text-[#8c675a]">
              拥有 8 年 B 端产品经验，长期参与电商、供应链、数据平台等企业系统建设；当前也在持续推进 AI 产品实践与个人项目探索。
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <a href="#projects" className="inline-flex h-12 items-center justify-center rounded-full bg-[#a47463] px-7 text-sm font-semibold text-white shadow-lg shadow-[#a47463]/20 transition hover:-translate-y-0.5">查看当前项目</a>
              <a href="/linfeng-resume.pdf" download className="inline-flex h-12 items-center justify-center rounded-full border border-[#cbb5a8] bg-white/70 px-7 text-sm font-semibold text-[#a47463] transition hover:-translate-y-0.5 hover:bg-white">下载简历</a>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="relative flex justify-center lg:justify-start">
            <div className="relative h-[520px] w-[390px] overflow-hidden rounded-t-[12rem] rounded-b-[2rem] bg-[#f5efe7] shadow-2xl shadow-[#a47463]/10">
              <Image
                src="/profile-photo-linfeng.jpg"
                alt="林凤个人照片"
                fill
                sizes="(max-width: 768px) 390px, 390px"
                className="object-cover"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#6f473b]/30 via-transparent to-white/10" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9 }}
            className="flex w-full max-w-[340px] flex-col justify-center gap-6 lg:ml-auto lg:pl-2"
          >
            <div className="rounded-[2rem] border border-[#e1d3c8] bg-white/72 p-5 text-[#a47463] shadow-sm shadow-[#a47463]/[0.07] backdrop-blur-xl md:p-6">
              <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#a47463]/65">联系</p>
              <div className="space-y-4 text-[15px] leading-7 text-[#8c675a]">
                <p className="flex items-center gap-3">
                  <Phone className="h-4 w-4 shrink-0 text-[#a47463]" aria-hidden />
                  <span className="font-medium tabular-nums">18503051130</span>
                </p>
                <div className="space-y-3">
                  <div className="flex items-start gap-4">
                    <WeChat className="mt-1 h-4 w-4 shrink-0 text-[#a47463]" aria-hidden />
                    <div className="inline-flex rounded-2xl border border-[#e8dcd4] bg-[#fcfbf9] p-2 shadow-inner">
                      <Image
                        src="/wechat-qr.png"
                        alt="首页微信二维码"
                        width={76}
                        height={76}
                        className="rounded-[10px]"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[2rem] border border-[#e1d3c8] bg-white/72 p-5 shadow-sm shadow-[#a47463]/[0.07] backdrop-blur-xl md:p-6">
              <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#a47463]/65">当前项目</p>
              <div className="space-y-2.5">
                {heroProjects.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => jumpToProject(item.target)}
                    className="group flex w-full items-center justify-between rounded-2xl border border-transparent bg-[#f7f3ee] px-4 py-2.5 text-left text-sm leading-6 text-[#7a5649] transition hover:border-[#8f5f4b] hover:bg-[#a47463] hover:text-white hover:shadow-md hover:shadow-[#a47463]/25 hover:ring-2 hover:ring-[#e8cfc3]/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a47463]/55 focus-visible:ring-offset-2 focus-visible:ring-offset-[#f8f6f1]"
                  >
                    <span>{item.label}</span>
                    <span className="text-xs opacity-35 transition group-hover:opacity-95" aria-hidden>
                      →
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="px-8 py-12 md:px-12 md:py-14 lg:px-20">
        <div className="mx-auto max-w-[1360px]">
          <div className="mb-12 max-w-5xl">
            <p
              id="projects"
              tabIndex={-1}
              className={`mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-gray-400 ${navAnchorClass}`}
            >
              个人与 AI 实践
            </p>
            <h2 className="text-3xl font-semibold leading-snug tracking-[-0.04em] text-[#1f2933] md:text-4xl">
              当前项目
            </h2>
            <p className="mt-4 text-base leading-8 text-gray-600">
              以下内容主要展示我当前主导的个人项目与 AI 产品实践，用于呈现我在产品设计、系统思考与 AI 落地方面的持续探索。
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {projects.map((project) => (
              <motion.article
                id={`project-${project.id}`}
                whileHover={{ y: -8 }}
                key={project.id}
                onMouseEnter={() => setHoveredProjectId(project.id)}
                onMouseLeave={() => setHoveredProjectId(null)}
                className={`rounded-[2rem] p-7 backdrop-blur-xl transition ${
                  emphasisProjectId === project.id
                    ? "border-2 border-[#a47463]/45 bg-white shadow-[0_22px_60px_-18px_rgba(164,116,99,0.38)] ring-4 ring-[#ead5c7]/85"
                    : "border border-white bg-white/70 shadow-sm"
                }`}
              >
                <div className="mb-5 inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-500">{project.tag}</div>
                <h3 className="text-2xl font-semibold tracking-[-0.02em]">{project.title}</h3>
                <p className="mt-4 min-h-28 text-sm leading-7 text-gray-600">{project.desc}</p>
                <div className="mt-6 flex flex-wrap gap-2">
                  {project.highlights.map((highlight) => (
                    <span
                      key={highlight}
                      className={`rounded-full px-3 py-1 text-xs ${
                        emphasisProjectId === project.id
                          ? "border border-[#d8b8a9] bg-[#f7eee8] text-[#8c675a]"
                          : "border border-gray-200 bg-white text-gray-500"
                      }`}
                    >
                      {highlight}
                    </span>
                  ))}
                </div>

                {project.actionType === "qr" ? (
                  <div className="mt-8 flex items-center justify-between rounded-3xl border border-[#e5d9cf] bg-[#faf8f4] px-5 py-4">
                    <div>
                      <p className="text-sm font-medium text-[#8c675a]">{project.actionLabel}</p>
                      <p className="mt-1 text-xs text-gray-400">可扫码查看对应产品形态或体验入口</p>
                    </div>
                    <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-[1.4rem] border border-[#e5d9cf] bg-white shadow-sm">
                      <Image
                        src="/story-miniprogram-qr.png"
                        alt={`${project.title} 二维码`}
                        width={96}
                        height={96}
                        className="h-full w-full scale-[1.35] object-contain"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="mt-8 flex items-center justify-between rounded-3xl border border-[#e5d9cf] bg-[#faf8f4] px-5 py-4">
                    <div className="min-w-0 pr-4">
                      <p className="text-sm font-medium text-[#8c675a]">{project.actionLabel}</p>
                      <p className="mt-1 truncate text-xs text-gray-400">https://234/lost</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowDevModal(true)}
                      className="inline-flex h-24 w-24 shrink-0 items-center justify-center rounded-[1.4rem] border border-[#e5d9cf] bg-white text-sm font-medium text-[#8c675a] shadow-sm transition hover:bg-[#f5efe7]"
                    >
                      打开链接
                    </button>
                  </div>
                )}
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-8 py-12 md:px-12 md:py-14 lg:px-20">
        <div className="mx-auto max-w-[1360px]">
          <div className="mb-10 max-w-3xl">
            <p
              id="enterprise"
              tabIndex={-1}
              className={`mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-gray-400 ${navAnchorClass}`}
            >
              企业项目经验
            </p>
            <h2 className="max-w-[640px] text-2xl font-semibold leading-snug tracking-[-0.03em] text-[#1f2933] md:text-3xl">
              职业背景中的真实业务项目
            </h2>
            <p className="mt-3 max-w-[720px] text-sm leading-7 text-gray-600">
              与企业侧交付相关的工作履历摘要
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {enterpriseProjects.map((ep, index) => (
              <motion.article
                key={ep.title}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-10%" }}
                transition={{ duration: 0.45, delay: index * 0.04, ease: [0.22, 1, 0.36, 1] as const }}
                whileHover={{ y: -6 }}
                whileTap={{ scale: 0.985 }}
                className="group relative cursor-default overflow-hidden rounded-2xl border border-[#e5d9cf] bg-[#faf8f4]/90 p-5 shadow-sm backdrop-blur-sm transition-colors duration-300 hover:border-[#caa392] hover:bg-white hover:shadow-[0_22px_60px_-44px_rgba(140,103,90,0.55)]"
              >
                <div className="pointer-events-none absolute -right-10 -top-10 h-24 w-24 rounded-full bg-[#ead8ce]/0 blur-2xl transition-colors duration-300 group-hover:bg-[#ead8ce]/70" />
                <h3 className="relative text-lg font-semibold tracking-[-0.02em] text-[#a47463] transition-colors duration-300 group-hover:text-[#8c675a]">
                  {ep.title}
                </h3>
                <p className="relative mt-3 min-h-[3.5rem] line-clamp-2 text-sm leading-7 text-gray-600 transition-colors duration-300 group-hover:text-gray-700">
                  {ep.summary}
                </p>
                <p className="mt-4 text-xs font-medium uppercase tracking-[0.12em] text-gray-400">关键词</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {ep.keywords.map((kw) => (
                    <span
                      key={kw}
                      className="rounded-full border border-[#e5d9cf] bg-white px-2.5 py-1 text-xs text-[#8c675a] transition-colors duration-300 group-hover:border-[#d5b7aa] group-hover:bg-[#faf8f4]"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-8 py-12 md:px-12 md:py-14 lg:px-20">
        <div className="mx-auto max-w-[1360px] rounded-[2.5rem] border border-[#e5d9cf] bg-[linear-gradient(135deg,#8f6b5d_0%,#a98071_45%,#c9a696_100%)] p-8 text-white md:p-12">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p
                id="case-study-details"
                tabIndex={-1}
                className={`mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-white/65 ${navAnchorClass}`}
              >
                案例研究
              </p>
              <h2 className="max-w-[520px] text-3xl font-semibold leading-snug tracking-[-0.04em] md:text-4xl">
                用同一套框架，把产品从问题到落地想清楚、说清楚
              </h2>
              <p className="mt-5 leading-7 text-white/80">每个项目都从问题、目标、设计、AI参与方式、MVP取舍和结果展开。</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {caseStudy.map((item) => (
                <div key={item} className="rounded-3xl border border-white/20 bg-white/10 p-5 backdrop-blur-sm">
                  <CheckCircle2 className="mb-4 h-5 w-5 text-[#f4dccf]" />
                  <p className="font-medium">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-8 py-12 md:px-12 md:py-14 lg:px-20">
        <div className="mx-auto max-w-[1360px]">
          <div className="mb-12 max-w-3xl">
            <p
              id="skills"
              tabIndex={-1}
              className={`mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-gray-400 ${navAnchorClass}`}
            >
              核心能力
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {skills.map((skill, index) => {
              const SkillIcon = skill.icon;
              return (
                <motion.article
                  key={skill.title}
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-10%" }}
                  transition={{ duration: 0.45, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] as const }}
                  whileHover={{ y: -6 }}
                  whileTap={{ scale: 0.985 }}
                  className="group relative cursor-default overflow-hidden rounded-[2rem] border border-white bg-white/70 p-6 shadow-sm backdrop-blur-xl transition-colors duration-300 hover:border-[#e5d9cf] hover:bg-white hover:shadow-[0_22px_60px_-44px_rgba(140,103,90,0.45)]"
                >
                  <div className="pointer-events-none absolute -right-12 -top-12 h-28 w-28 rounded-full bg-[#ead8ce]/0 blur-2xl transition-colors duration-300 group-hover:bg-[#ead8ce]/70" />
                  <div className="relative mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 text-gray-500 transition-all duration-300 group-hover:scale-105 group-hover:bg-[#f7eee8] group-hover:text-[#8c675a]">
                    <SkillIcon className="h-5 w-5" />
                  </div>
                  <h3 className="relative font-semibold transition-colors duration-300 group-hover:text-[#8c675a]">{skill.title}</h3>
                  <ul className="relative mt-4 space-y-2 text-sm text-gray-600">
                    {skill.items.map((item, itemIndex) => (
                      <li
                        key={item}
                        className="flex items-start gap-2 transition-all duration-300 group-hover:translate-x-0.5 group-hover:text-gray-700"
                        style={{ transitionDelay: `${itemIndex * 30}ms` }}
                      >
                        <span className="mt-2 inline-block h-1 w-1 shrink-0 rounded-full bg-gray-300 transition-colors duration-300 group-hover:bg-[#a47463]" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </motion.article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="px-8 py-12 md:px-12 md:py-14 lg:px-20">
        <div className="mx-auto grid max-w-[1360px] gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p
              id="about"
              tabIndex={-1}
              className={`mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-gray-400 ${navAnchorClass}`}
            >
              关于我
            </p>
            <h2 className="max-w-[520px] text-3xl font-semibold leading-snug tracking-[-0.04em] md:text-4xl">
              职业履历与个人探索双线并行
            </h2>
          </div>
          <div className="rounded-[2rem] border border-white bg-white/70 p-8 leading-8 text-gray-600 shadow-sm backdrop-blur-xl">
            {aboutParagraphs.map((paragraph) => (
              <p key={paragraph} className="mt-0 mb-5 last:mb-0">
                {paragraph}
              </p>
            ))}
          </div>
        </div>
      </section>

      <section className="px-8 pb-12 pt-12 md:px-12 md:pb-14 md:pt-14 lg:px-20">
        <div className="mx-auto max-w-[1360px] rounded-[2.5rem] border border-white bg-white/70 p-8 shadow-sm backdrop-blur-xl md:p-12">
          <div className="grid items-center gap-8 lg:grid-cols-[1fr_auto]">
            <div>
              <p
                id="contact"
                tabIndex={-1}
                className={`mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-gray-400 ${navAnchorClass}`}
              >
                联系方式
              </p>
              <h2 className="max-w-[520px] text-3xl font-semibold leading-snug tracking-[-0.04em] md:text-4xl">
                欢迎联系 — AI产品、数据、B 端系统落地的交流
              </h2>
            </div>
            <div className="space-y-3 text-sm text-gray-600">
              <a href="mailto:1546529912@qq.com" className="flex items-center gap-3 hover:text-[#8c675a]"><Mail className="h-4 w-4" />1546529912@qq.com</a>
              <a href="tel:18503051130" className="flex items-center gap-3 hover:text-[#8c675a]"><Phone className="h-4 w-4" />18503051130</a>
              <p className="flex items-center gap-3"><WeChat className="h-4 w-4" />linfeng-1546529912</p>
              <p className="flex items-center gap-3"><span className="inline-flex h-4 w-4 items-center justify-center text-xs">G</span>如需项目材料，可先通过邮件或微信联系</p>
              <a href="/linfeng-resume.pdf" download className="mt-3 inline-flex h-12 items-center rounded-2xl bg-[#111827] px-5 text-sm font-medium text-white">
                下载简历
              </a>
            </div>
          </div>
        </div>
      </section>
      <PortfolioChat />
      <AnimatePresence>
        {showDevModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-6 backdrop-blur-[2px]"
            onClick={() => setShowDevModal(false)}
            role="dialog"
            aria-modal="true"
            aria-label="系统提示"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 4 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] as const }}
              className="w-full max-w-sm rounded-3xl border border-[#e5d9cf] bg-[#faf8f4] p-8 text-center shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-base font-medium text-[#8c675a]">系统正在开发中～～</p>
              <p className="mt-2 text-xs text-gray-400">敬请期待，感谢理解</p>
              <button
                type="button"
                onClick={() => setShowDevModal(false)}
                className="mt-6 inline-flex h-11 items-center justify-center rounded-2xl bg-[#111827] px-6 text-sm font-medium text-white transition hover:bg-[#1f2937]"
              >
                我知道了
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
