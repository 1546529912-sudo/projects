import Image from "next/image";
import Link from "next/link";
import { about, contact, projects, site, skillGroups } from "@/data/site";

const metrics = [
  { value: "45% → 28%", label: "AI 客服转人工率下降" },
  { value: "22 省市", label: "数据平台覆盖范围" },
  { value: "0 到 1", label: "供应链一体化平台搭建" },
];

const processCards = [
  {
    index: "01",
    title: "先定义真实阻塞点",
    description: "把模糊需求翻译成可验证场景，先回答谁卡住了、为什么卡住。",
  },
  {
    index: "02",
    title: "再设计最短闭环",
    description: "优先让系统跑起来，而不是一开始就堆完整功能和理想流程。",
  },
  {
    index: "03",
    title: "只在关键位置放 AI",
    description: "让 AI 服务效率、体验和判断质量，而不是成为展示层的装饰。",
  },
];

export function SagePalettePage() {
  const featuredProjects = projects.slice(0, 3);

  return (
    <main className="demo-page min-h-screen overflow-hidden text-[var(--ink-strong)]">
      <div className="ambient ambient-lilac" />
      <div className="ambient ambient-sky" />
      <div className="ambient ambient-green" />

      <section className="relative mx-auto flex min-h-screen w-[min(1180px,calc(100vw-32px))] flex-col px-2 pb-12 pt-5 md:w-[min(1180px,calc(100vw-56px))] md:px-0">
        <header className="glass-panel sticky top-5 z-20 flex items-center justify-between gap-6 rounded-[26px] px-5 py-4 md:px-7">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-[18px] border border-white/70 bg-[linear-gradient(145deg,rgba(125,163,122,0.22),rgba(200,183,221,0.44))] font-semibold text-[var(--green-deep)]">
              LF
            </div>
            <div>
              <p className="label-text">Alternate Palette Demo</p>
              <h1 className="text-lg font-semibold tracking-[0.04em]">{site.name}</h1>
            </div>
          </div>
          <nav className="hidden items-center gap-6 text-sm text-[var(--ink-soft)] md:flex">
            <Link href="/" className="transition hover:text-[var(--ink-strong)]">
              原页面
            </Link>
            <a href="#projects" className="transition hover:text-[var(--ink-strong)]">
              项目
            </a>
            <a href="#skills" className="transition hover:text-[var(--ink-strong)]">
              能力
            </a>
            <a href="#contact" className="transition hover:text-[var(--ink-strong)]">
              联系
            </a>
          </nav>
        </header>

        <section className="grid flex-1 items-center gap-10 px-2 py-14 md:px-4 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12 lg:py-18">
          <div className="max-w-[650px]">
            <p className="label-text">保留原结构 · 只换一套新的色彩气质</p>
            <h2 className="mt-5 max-w-[12ch] font-serif text-[clamp(3rem,7vw,5.5rem)] leading-[1.02] tracking-[-0.045em] text-[var(--ink-strong)]">
              同样的作品集骨架
              <span className="block text-[var(--green-deep)]">换成更柔和的自然系配色</span>
            </h2>
            <p className="mt-6 max-w-[60ch] text-base leading-8 text-[var(--ink-soft)] md:text-lg">
              这个页面不改你原来喜欢的表达方式，只把主色、背景氛围、卡片层次和按钮语气换成另一种版本，方便你直接比较哪套更适合继续扩展。
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="#projects"
                className="inline-flex h-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#58755d_0%,#85aa80_100%)] px-6 text-sm font-medium text-white shadow-[0_14px_28px_rgba(88,117,93,0.26)] transition hover:-translate-y-0.5"
              >
                看新配色项目区
              </a>
              <Link
                href="/"
                className="inline-flex h-12 items-center justify-center rounded-2xl border border-[var(--line)] bg-white/55 px-6 text-sm font-medium text-[var(--ink-strong)] backdrop-blur-sm transition hover:-translate-y-0.5"
              >
                回到原页面
              </Link>
            </div>

            <ul className="mt-10 grid gap-4 sm:grid-cols-3">
              {metrics.map((item) => (
                <li key={item.label} className="glass-panel rounded-[22px] px-5 py-5">
                  <strong className="block text-lg font-semibold text-[var(--ink-strong)]">
                    {item.value}
                  </strong>
                  <span className="mt-2 block text-sm leading-6 text-[var(--ink-soft)]">
                    {item.label}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="relative">
            <div className="glass-panel relative overflow-hidden rounded-[34px] p-4 shadow-[0_24px_70px_rgba(49,72,56,0.14)]">
              <div className="absolute inset-x-6 top-6 h-24 rounded-full bg-[radial-gradient(circle,rgba(207,232,247,0.65),transparent_72%)] blur-2xl" />
              <div className="relative overflow-hidden rounded-[28px] border border-white/70">
                <Image
                  src="/profile-photo-linfeng.jpg"
                  alt="林凤的个人照片"
                  width={900}
                  height={1120}
                  className="h-[520px] w-full object-cover object-center"
                  priority
                />
              </div>
              <div className="relative mt-4 grid gap-3 md:grid-cols-2">
                <div className="rounded-[22px] bg-white/58 px-4 py-4 backdrop-blur-sm">
                  <p className="text-xs uppercase tracking-[0.18em] text-[var(--green-deep)]">
                    Visual Mood
                  </p>
                  <strong className="mt-2 block text-base font-semibold">自然光感 + 低饱和绿调</strong>
                  <span className="mt-2 block text-sm leading-6 text-[var(--ink-soft)]">
                    让整站先建立温和、专业、克制的第一印象。
                  </span>
                </div>
                <div className="rounded-[22px] bg-[rgba(246,247,242,0.72)] px-4 py-4 backdrop-blur-sm">
                  <p className="text-xs uppercase tracking-[0.18em] text-[var(--green-deep)]">
                    Palette
                  </p>
                  <div className="mt-3 flex gap-3">
                    {["#7da37a", "#c8b7dd", "#cfe8f7", "#f6f7f2"].map((color) => (
                      <span
                        key={color}
                        className="h-10 w-10 rounded-full border border-white/80 shadow-sm"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="glass-panel absolute -left-3 top-10 hidden w-52 rounded-[24px] px-4 py-4 lg:block">
              <p className="label-text">AI Product</p>
              <strong className="mt-2 block text-base font-semibold">RAG · 意图识别 · 多轮对话</strong>
            </div>

            <div className="glass-panel absolute -bottom-4 right-4 hidden w-56 rounded-[24px] px-4 py-4 lg:block">
              <p className="label-text">System Design</p>
              <strong className="mt-2 block text-base font-semibold">交易 · 供应链 · 数据平台</strong>
            </div>
          </div>
        </section>
      </section>

      <section
        id="projects"
        className="mx-auto w-[min(1180px,calc(100vw-32px))] px-2 py-8 md:w-[min(1180px,calc(100vw-56px))] md:px-0"
      >
        <div className="mb-7 px-2 md:px-4">
          <p className="label-text">Selected Work</p>
          <h3 className="mt-3 font-serif text-4xl tracking-[-0.04em] text-[var(--ink-strong)] md:text-5xl">
            项目内容不变，情绪层换成另一种色温
          </h3>
          <p className="mt-4 max-w-[62ch] text-base leading-8 text-[var(--ink-soft)]">
            你可以把它理解成同一份个人网站的第二套皮肤。内容结构和浏览节奏都不需要重来，重点只在色彩和氛围的取向。
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {featuredProjects.map((project, index) => (
            <article
              key={project.id}
              className={`glass-panel rounded-[30px] p-6 ${
                index === 0 ? "md:-translate-y-4" : ""
              }`}
            >
              <span className="inline-flex rounded-full border border-[var(--line)] bg-white/55 px-3 py-1 text-xs uppercase tracking-[0.16em] text-[var(--green-deep)]">
                {project.previewNote}
              </span>
              <h4 className="mt-5 font-serif text-2xl tracking-[-0.03em] text-[var(--ink-strong)]">
                {project.name}
              </h4>
              <p className="mt-4 text-sm leading-7 text-[var(--ink-soft)]">{project.summary}</p>
              <ul className="mt-6 space-y-3 text-sm leading-7 text-[var(--ink-soft)]">
                {project.highlights.slice(0, 3).map((highlight) => (
                  <li key={highlight} className="flex gap-3">
                    <span className="mt-2 h-2 w-2 rounded-full bg-[var(--green)]" />
                    <span>{highlight}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section
        id="process"
        className="mx-auto grid w-[min(1180px,calc(100vw-32px))] gap-5 px-2 py-14 md:w-[min(1180px,calc(100vw-56px))] md:px-0 lg:grid-cols-[0.82fr_1.18fr]"
      >
        <div className="px-2 md:px-4">
          <p className="label-text">Design Direction</p>
          <h3 className="mt-3 font-serif text-4xl tracking-[-0.04em] text-[var(--ink-strong)]">
            这版只改颜色和氛围，不碰你喜欢的浏览逻辑
          </h3>
          <p className="mt-4 max-w-[58ch] text-base leading-8 text-[var(--ink-soft)]">
            如果后面要继续出第三套、第四套颜色，也可以沿用同样方法，把版式和交互都锁住，只替换视觉变量。
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {processCards.map((card) => (
            <article key={card.index} className="glass-panel rounded-[28px] px-5 py-6">
              <span className="text-sm font-semibold tracking-[0.16em] text-[var(--green-deep)]">
                {card.index}
              </span>
              <h4 className="mt-4 text-xl font-semibold tracking-[-0.03em] text-[var(--ink-strong)]">
                {card.title}
              </h4>
              <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">{card.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section
        id="skills"
        className="mx-auto w-[min(1180px,calc(100vw-32px))] px-2 py-8 md:w-[min(1180px,calc(100vw-56px))] md:px-0"
      >
        <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="glass-panel rounded-[32px] px-6 py-7">
            <p className="label-text">About The Tone</p>
            <h3 className="mt-3 font-serif text-3xl tracking-[-0.04em] text-[var(--ink-strong)] md:text-4xl">
              适合作为你原站之外的第二种品牌语气
            </h3>
            <div className="mt-5 space-y-4 text-sm leading-7 text-[var(--ink-soft)]">
              {about.path.slice(0, 2).map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {skillGroups.map((group) => (
              <article key={group.title} className="glass-panel rounded-[28px] px-5 py-6">
                <h4 className="text-lg font-semibold tracking-[-0.02em] text-[var(--ink-strong)]">
                  {group.title}
                </h4>
                <ul className="mt-4 space-y-3 text-sm leading-7 text-[var(--ink-soft)]">
                  {group.items.slice(0, 4).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        id="contact"
        className="mx-auto w-[min(1180px,calc(100vw-32px))] px-2 pb-18 pt-14 md:w-[min(1180px,calc(100vw-56px))] md:px-0"
      >
        <div className="glass-panel rounded-[36px] px-6 py-8 md:px-8 md:py-10">
          <p className="label-text">Contact</p>
          <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <h3 className="max-w-[15ch] font-serif text-4xl tracking-[-0.04em] text-[var(--ink-strong)] md:text-5xl">
                如果这套颜色更适合某个场景，它已经可以单独作为第二页面存在
              </h3>
              <p className="mt-4 max-w-[60ch] text-base leading-8 text-[var(--ink-soft)]">
                比如你可以把它拿去做另一个方向的个人介绍页，或者当成单独的专题入口页，而不是替换原站。
              </p>
            </div>

            <div className="grid gap-3 text-sm text-[var(--ink-soft)]">
              <a
                href={`mailto:${contact.email}`}
                className="rounded-2xl border border-[var(--line)] bg-white/55 px-5 py-4 transition hover:border-[rgba(84,104,82,0.24)] hover:text-[var(--ink-strong)]"
              >
                {contact.email}
              </a>
              <a
                href={`tel:${contact.phone}`}
                className="rounded-2xl border border-[var(--line)] bg-white/55 px-5 py-4 transition hover:border-[rgba(84,104,82,0.24)] hover:text-[var(--ink-strong)]"
              >
                {contact.phone}
              </a>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
