"use client";

import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import {
  about,
  contact,
  navItems,
  projects,
  site,
  skillGroups,
  type Project,
} from "@/data/site";

const sectionTitle = "text-[0.7rem] font-semibold uppercase tracking-[0.35em] text-[#6366f1]";

function smartShort(text: string, limit = 70) {
  const punct = text.match(/^[\s\S]*?[。；;,.!?]/)?.[0];
  const candidate = punct && punct.length > 8 ? punct : text;
  if (candidate.length <= limit) return candidate;
  return candidate.slice(0, limit).trimEnd() + "…";
}

function fadeUp(delay = 0) {
  return {
    initial: { opacity: 0, y: 18 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: "-12%" },
    transition: {
      duration: 0.65,
      ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
      delay,
    },
  };
}

function PrimaryButton({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex h-12 items-center justify-center rounded-2xl bg-gradient-to-r from-[#6366f1] to-[#818cf8] px-8 text-[15px] font-medium text-white shadow-[0_14px_36px_-12px_rgba(99,102,241,0.55)] transition-[box-shadow,filter] duration-500 hover:shadow-[0_18px_44px_-12px_rgba(79,70,229,0.5)] hover:brightness-[1.03] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#6366f1]"
    >
      {children}
    </Link>
  );
}

function GhostButton({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex h-12 items-center justify-center rounded-2xl border border-[#e2e8f0] bg-white/60 px-8 text-[15px] font-medium text-[#0f172a] backdrop-blur-sm transition-colors duration-300 hover:border-[#c7d2fe] hover:bg-[#eef2ff]/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#6366f1]"
    >
      {children}
    </Link>
  );
}

function AccentButton({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex h-12 items-center justify-center rounded-2xl border border-[#dbe4dc] bg-[linear-gradient(135deg,rgba(125,163,122,0.14),rgba(200,183,221,0.18))] px-8 text-[15px] font-medium text-[#45634b] shadow-[0_12px_30px_-20px_rgba(69,99,75,0.45)] backdrop-blur-sm transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_36px_-22px_rgba(69,99,75,0.5)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#7da37a]"
    >
      {children}
    </Link>
  );
}

function SiteNav() {
  return (
    <header className="relative md:sticky top-0 z-50 border-b border-white/50 bg-[#f8fafc]/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3 md:px-8">
        <Link
          href="#hero"
          className="text-sm font-semibold tracking-tight text-[#0f172a] md:text-[15px]"
        >
          AI Product Builder
        </Link>
        <nav className="no-scrollbar flex flex-1 justify-end gap-1 overflow-x-auto md:hidden" aria-label="页面导航">
          {navItems
            .filter((i) => ["#projects", "#case-study", "#contact"].includes(i.href))
            .map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="shrink-0 rounded-full px-3 py-1.5 text-[13px] text-[#64748b] transition-colors hover:bg-white/80 hover:text-[#0f172a]"
              >
                {item.label}
              </Link>
            ))}
        </nav>
        <nav
          className="hidden no-scrollbar flex-1 justify-end gap-1 overflow-x-auto md:flex md:gap-2"
          aria-label="页面导航"
        >
          {navItems.slice(1).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="shrink-0 rounded-full px-3 py-1.5 text-[13px] text-[#64748b] transition-colors hover:bg-white/80 hover:text-[#0f172a] md:text-sm"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}

function QRCodePlaceholder({ label }: { label: string }) {
  return (
    <div className="flex aspect-square w-full items-center justify-center rounded-2xl border-2 border-dashed border-[#e2e8f0] bg-white/60 p-4">
      <div className="text-center">
        <div className="text-sm font-semibold text-[#0f172a]">{label}</div>
        <div className="mt-2 text-xs text-[#94a3b8]">占位块：小程序/微信二维码</div>
      </div>
    </div>
  );
}

function HeroOrbs({ reducedMotion }: { reducedMotion: boolean }) {
  if (reducedMotion) {
    return (
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden"
        aria-hidden
      >
        <div className="absolute -left-24 top-0 h-[420px] w-[420px] rounded-full bg-[#e0e7ff]/80 blur-3xl" />
        <div className="absolute -right-20 bottom-0 h-[380px] w-[380px] rounded-full bg-[#cffafe]/50 blur-3xl" />
      </div>
    );
  }
  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden
    >
      <div className="hero-orb hero-orb-a absolute -left-24 top-0 h-[420px] w-[420px] rounded-full bg-[#e0e7ff]/90 blur-3xl" />
      <div className="hero-orb hero-orb-b absolute -right-20 bottom-0 h-[380px] w-[380px] rounded-full bg-[#cffafe]/55 blur-3xl" />
      <div className="hero-orb hero-orb-c absolute left-1/3 top-1/2 h-[280px] w-[280px] -translate-y-1/2 rounded-full bg-[#ede9fe]/70 blur-3xl" />
    </div>
  );
}

function ProjectCard({
  project,
  reducedMotion,
}: {
  project: Project;
  reducedMotion: boolean;
}) {
  return (
    <motion.article
      id={project.id}
      className="group relative flex flex-col overflow-hidden rounded-[24px] border border-white/70 bg-white/70 p-6 shadow-[0_22px_58px_-52px_rgba(15,23,42,0.28)] backdrop-blur-md transition-shadow duration-500 hover:shadow-[0_30px_70px_-58px_rgba(99,102,241,0.28)] md:p-8"
      {...(reducedMotion
        ? {}
        : { whileHover: { y: -6 }, transition: { type: "spring", stiffness: 260, damping: 22 } })}
    >
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-[#eef2ff] px-3 py-1 text-xs font-medium text-[#4f46e5]">
          {project.position}
        </span>
        <span className="text-xs text-[#94a3b8]">{project.previewNote}</span>
      </div>
      <h3 className="text-2xl font-semibold tracking-tight text-[#0f172a] md:text-[1.65rem]">
        {project.name}
      </h3>
      <p className="mt-3 text-[14px] leading-relaxed text-[#475569]">
        {project.summary}
      </p>
      <p className="mt-4 hidden text-sm leading-relaxed text-[#64748b] md:block">
        {project.narrative}
      </p>
      <ul className="mt-5 space-y-2 border-t border-[#f1f5f9] pt-4 text-sm text-[#334155]">
        {project.highlights.map((h) => (
          <li key={h} className="flex gap-2">
            <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[#6366f1]" />
            <span>{h}</span>
          </li>
        ))}
      </ul>
      <div className="mt-8 flex aspect-[16/10] items-center justify-center rounded-2xl border border-dashed border-[#e2e8f0] bg-gradient-to-br from-[#f8fafc] to-[#eef2ff]/40 text-sm text-[#94a3b8]">
        案例配图占位
      </div>
    </motion.article>
  );
}

function CaseStudyPanel({ project }: { project: Project }) {
  const rows: { k: string; v: string }[] = [
    { k: "用户问题", v: project.caseStudy.problem },
    { k: "产品目标", v: project.caseStudy.goal },
    { k: "核心设计", v: project.caseStudy.design },
    { k: "AI 参与", v: project.caseStudy.aiRole },
    { k: "产品思考", v: project.caseStudy.thinking },
    { k: "MVP 取舍", v: project.caseStudy.mvp },
    { k: "项目结果", v: project.caseStudy.outcome },
  ];
  return (
    <div className="rounded-[24px] border border-[#f1f5f9] bg-white/90 p-6 shadow-sm md:p-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className={sectionTitle}>Case Study</p>
          <h3 className="mt-2 text-xl font-semibold text-[#0f172a] md:text-2xl">
            {project.name}
          </h3>
        </div>
        <span className="text-sm text-[#64748b]">{project.position}</span>
      </div>
      <dl className="grid gap-5 md:grid-cols-2">
        {rows.map((row, idx) => {
          const hideOnMobile = idx >= 3;
          const wrapperClass = hideOnMobile
            ? "hidden md:block md:col-span-2"
            : "md:col-span-2";
          return (
            <div key={row.k} className={wrapperClass}>
              <dt className="text-[11px] font-semibold uppercase tracking-wider text-[#6366f1]">
                {row.k}
              </dt>
              <dd className="mt-2 text-[13px] leading-relaxed text-[#475569]">
                {smartShort(row.v, 62)}
              </dd>
            </div>
          );
        })}
      </dl>

      {project.id === "crm-ai" ? (
        <div className="mt-8">
          <div className="mb-3 text-sm font-semibold text-[#0f172a]">
            微信 / 小程序二维码（CRM 展示位）
          </div>
          <QRCodePlaceholder label="放置二维码" />
        </div>
      ) : null}
    </div>
  );
}

export function PortfolioPage() {
  const reducedMotion = useReducedMotion() ?? false;

  return (
    <div className="min-h-screen bg-[#f8fafc] text-[#0f172a]">
      <SiteNav />

      <section
        id="hero"
        className="relative overflow-hidden border-b border-[#e2e8f0]/60"
      >
        <HeroOrbs reducedMotion={reducedMotion} />
        <div className="relative mx-auto max-w-6xl px-5 pb-20 pt-16 md:px-8 md:pb-28 md:pt-24">
          <motion.p
            className={sectionTitle}
            initial={reducedMotion ? false : { opacity: 0, y: 12 }}
            animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            Portfolio Demo
          </motion.p>
          <motion.h1
            className="mt-4 max-w-3xl text-[2.25rem] font-semibold leading-[1.15] tracking-tight text-[#0f172a] md:text-[3.25rem]"
            initial={reducedMotion ? false : { opacity: 0, y: 16 }}
            animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.05 }}
          >
            {site.name}
            <span className="mt-2 block text-[1.35rem] font-normal text-[#475569] md:text-2xl md:font-light">
              {site.role}
            </span>
          </motion.h1>
          <motion.p
            className="mt-8 max-w-2xl text-[17px] leading-[1.75] text-[#475569] md:text-lg"
            initial={reducedMotion ? false : { opacity: 0, y: 16 }}
            animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.12 }}
          >
            {site.heroLead}
          </motion.p>
          <motion.ul
            className="mt-6 flex flex-wrap gap-2"
            initial={reducedMotion ? false : { opacity: 0 }}
            animate={reducedMotion ? undefined : { opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            {site.heroKeywords.map((kw) => (
              <li
                key={kw}
                className="rounded-full border border-[#e2e8f0] bg-white/70 px-3 py-1 text-sm text-[#475569] backdrop-blur-sm"
              >
                {kw}
              </li>
            ))}
          </motion.ul>
          <motion.div
            className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center"
            initial={reducedMotion ? false : { opacity: 0, y: 12 }}
            animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.22 }}
          >
            <PrimaryButton href="#projects">查看作品</PrimaryButton>
            <GhostButton href="#contact">联系我</GhostButton>
            <AccentButton href="/sage">看另一套配色页</AccentButton>
          </motion.div>
          <motion.p
            className="mt-4 text-sm text-[#94a3b8]"
            initial={reducedMotion ? false : { opacity: 0 }}
            animate={reducedMotion ? undefined : { opacity: 1 }}
            transition={{ duration: 0.45, delay: 0.28 }}
          >
            当前首页保留原来的结构和交互，新配色版本已单独放到 <code>/sage</code>。
          </motion.p>
        </div>
      </section>

      <section
        id="projects"
        className="mx-auto max-w-6xl scroll-mt-24 px-5 py-20 md:px-8 md:py-28"
      >
        <motion.div {...fadeUp()}>
          <p className={sectionTitle}>Selected work</p>
          <h2 className="mt-3 max-w-xl text-3xl font-semibold tracking-tight md:text-4xl">
            项目展示
          </h2>
          <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-[#64748b] md:text-base">
            三个方向：AI 教育、沉浸式内容、企业工作流。与开发计划一致，M2
            与 M3 共用同一份结构化数据；此处为 Demo 文案与占位图。
          </p>
        </motion.div>
        <div className="mt-14 grid gap-8 lg:grid-cols-3">
          {projects.map((p, i) => (
            <motion.div key={p.id} {...fadeUp(0.08 * i)}>
              <ProjectCard project={p} reducedMotion={reducedMotion} />
            </motion.div>
          ))}
        </div>
      </section>

      <section
        id="case-study"
        className="border-y border-[#e2e8f0]/80 bg-white/40 py-20 md:py-28"
      >
        <div className="mx-auto max-w-6xl px-5 md:px-8">
          <motion.div {...fadeUp()}>
            <p className={sectionTitle}>Deep dive</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
              Case Study
            </h2>
            <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-[#64748b]">
              按 PRD 3.1～3.7 结构组织的精简叙事；正式站可继续压缩或改为折叠块。
            </p>
          </motion.div>
          <div className="mt-14 space-y-10">
            {projects.map((p, i) => (
              <motion.div key={p.id} {...fadeUp(0.06 * i)}>
                <CaseStudyPanel project={p} />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section
        id="skills"
        className="mx-auto max-w-6xl scroll-mt-24 px-5 py-20 md:px-8 md:py-28"
      >
        <motion.div {...fadeUp()}>
          <p className={sectionTitle}>Capabilities</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
            技能
          </h2>
        </motion.div>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {skillGroups.map((g, i) => (
            <motion.div
              key={g.title}
              {...fadeUp(0.05 * i)}
              className="rounded-[24px] border border-white/80 bg-white/80 p-6 shadow-[0_16px_40px_-32px_rgba(15,23,42,0.3)] backdrop-blur-sm"
            >
              <h3 className="text-lg font-semibold text-[#0f172a]">{g.title}</h3>
              <ul className="mt-4 space-y-2 text-sm leading-relaxed text-[#475569]">
                {g.items.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="text-[#6366f1]">·</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </section>

      <section
        id="about"
        className="border-t border-[#e2e8f0]/80 bg-gradient-to-b from-[#f8fafc] to-white py-20 md:py-28"
      >
        <div className="mx-auto max-w-6xl px-5 md:px-8">
          <motion.div {...fadeUp()}>
            <p className={sectionTitle}>About</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
              关于我
            </h2>
          </motion.div>
          <motion.div
            {...fadeUp(0.08)}
            className="mt-10 grid gap-10 md:grid-cols-3"
          >
            <div className="md:col-span-2 space-y-5 text-[15px] leading-relaxed text-[#475569]">
              {about.path.map((p) => (
                <p key={p}>{p}</p>
              ))}
            </div>
            <div className="rounded-[24px] border border-[#f1f5f9] bg-white/90 p-6 shadow-sm">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-[#6366f1]">
                当前关注
              </h3>
              <ul className="mt-4 space-y-3 text-sm text-[#475569]">
                {about.focus.map((f) => (
                  <li key={f} className="flex gap-2">
                    <span className="text-[#6366f1]">—</span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
          <motion.p
            {...fadeUp(0.12)}
            className="mt-10 max-w-3xl text-[15px] leading-relaxed text-[#64748b]"
          >
            {about.philosophy}
          </motion.p>
        </div>
      </section>

      <section
        id="contact"
        className="mx-auto max-w-6xl scroll-mt-24 px-5 pb-24 pt-16 md:px-8 md:pb-32"
      >
        <motion.div {...fadeUp()}>
          <p className={sectionTitle}>Contact</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
            联系方式
          </h2>
          <p className="mt-4 max-w-xl text-[15px] text-[#64748b]">
            邮箱必备；微信展示方式按你的隐私策略再定。以下为 Demo 占位。
          </p>
        </motion.div>
        <motion.div
          {...fadeUp(0.06)}
          className="mt-10 grid gap-6 rounded-[24px] border border-[#e2e8f0] bg-white/85 p-6 shadow-[0_20px_50px_-40px_rgba(99,102,241,0.35)] backdrop-blur-md md:grid-cols-2 md:p-10"
        >
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#6366f1]">
              Email
            </h3>
            <a
              href={`mailto:${contact.email}`}
              className="mt-3 block text-lg font-medium text-[#0f172a] underline-offset-4 hover:underline"
            >
              {contact.email}
            </a>
          </div>
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#6366f1]">
              微信 / 小程序
            </h3>
            <p className="mt-3 text-[13px] leading-relaxed text-[#475569]">
              {smartShort(contact.wechat, 54)}
            </p>
            <div className="mt-4">
              <QRCodePlaceholder label="二维码位" />
            </div>
          </div>
          <div className="md:col-span-2 flex flex-wrap gap-3 border-t border-[#f1f5f9] pt-6">
            {contact.links.map((l) => (
              <a
                key={l.label}
                href={l.href}
                className="inline-flex h-11 items-center rounded-2xl border border-[#e2e8f0] bg-[#f8fafc] px-5 text-sm font-medium text-[#334155] transition-colors hover:border-[#c7d2fe] hover:bg-[#eef2ff]/60"
                {...(l.href.startsWith("http")
                  ? { target: "_blank", rel: "noopener noreferrer" }
                  : {})}
              >
                {l.label}
              </a>
            ))}
          </div>
        </motion.div>
      </section>

      <footer className="border-t border-[#e2e8f0] py-8 text-center text-sm text-[#94a3b8]">
        © {new Date().getFullYear()} {site.name} · AI Product Builder Portfolio
        Demo
      </footer>
    </div>
  );
}
