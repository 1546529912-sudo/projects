const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const OUT_DIR = path.resolve(__dirname, "../output/storybook-ui");
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const W = 750;
const H = 420;

const stories = [
  { slug: "the-red-apple", title: "The Red Apple", level: "L1 Seed", accent: "#ef7768", bg: ["#fff2df", "#f7e9da"] },
  { slug: "my-cat", title: "My Cat", level: "L1 Seed", accent: "#c99b72", bg: ["#eef8ee", "#fff0dd"] },
  { slug: "the-sun", title: "The Sun", level: "L1 Seed", accent: "#f6bd55", bg: ["#eaf8ff", "#fff1d7"] },
  { slug: "my-dog", title: "My Dog", level: "L1 Seed", accent: "#d9aa7c", bg: ["#eef7ff", "#fff0dc"] },
  { slug: "the-ball", title: "The Ball", level: "L1 Seed", accent: "#7eb8e8", bg: ["#eff8ff", "#fff3dd"] },
  { slug: "the-big-tree", title: "The Big Tree", level: "L1 Seed", accent: "#8fcf9b", bg: ["#edf8e9", "#fff0d9"] },
  { slug: "my-room", title: "My Room", level: "L1 Seed", accent: "#f3a678", bg: ["#fff2df", "#f2e7d8"] },
  { slug: "the-fish", title: "The Fish", level: "L1 Seed", accent: "#7ac9dc", bg: ["#eaf9ff", "#e8f4ea"] },
  { slug: "i-can-move", title: "I Can Move", level: "L1 Seed", accent: "#8caee8", bg: ["#eef8ff", "#fff0db"] },
  { slug: "the-moo", title: "The Moo", level: "L1 Seed", accent: "#c8a88a", bg: ["#f2faed", "#fff1dc"] },
];

function esc(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&apos;",
  })[char]);
}

function titleCase(slug) {
  return slug.split("-").map((s) => s[0].toUpperCase() + s.slice(1)).join(" ");
}

function blob(id, colors) {
  return `
  <linearGradient id="bg-${id}" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="${colors[0]}"/>
    <stop offset="1" stop-color="${colors[1]}"/>
  </linearGradient>`;
}

function bookCover(story, x, y, w, h, small = false) {
  const r = small ? 13 : 20;
  const sky = story.bg[0];
  const ground = story.bg[1];
  return `
  <g transform="translate(${x} ${y})">
    <rect x="0" y="0" width="${w}" height="${h}" rx="${r}" fill="#fffdf8" filter="url(#softShadow)"/>
    <clipPath id="clip-${story.slug}-${small ? "s" : "l"}"><rect x="0" y="0" width="${w}" height="${h}" rx="${r}"/></clipPath>
    <g clip-path="url(#clip-${story.slug}-${small ? "s" : "l"})">
      <rect width="${w}" height="${h}" fill="${sky}"/>
      <ellipse cx="${w * 0.2}" cy="${h * 0.14}" rx="${w * 0.48}" ry="${h * 0.28}" fill="#ffffff" opacity=".42"/>
      <ellipse cx="${w * 0.86}" cy="${h * 0.34}" rx="${w * 0.36}" ry="${h * 0.24}" fill="#ffe8bd" opacity=".36"/>
      <ellipse cx="${w * 0.5}" cy="${h * 1.04}" rx="${w * 0.72}" ry="${h * 0.3}" fill="${ground}" opacity=".96"/>
      ${illustration(story.slug, w, h, small)}
    </g>
  </g>`;
}

function illustration(slug, w, h, small) {
  const sx = w / 190;
  const sy = h / 134;
  const s = Math.min(sx, sy);
  const cx = w / 2;
  const cy = h / 2 + (small ? 2 : 6);
  const T = (inner) => `<g transform="translate(${cx} ${cy}) scale(${s})">${inner}</g>`;
  const eye = (x, y, r = 5) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#34383a"/><circle cx="${x - r * .28}" cy="${y - r * .32}" r="${r * .28}" fill="#fffdf4"/>`;

  if (slug === "the-red-apple") return T(`
    <path d="M-42 -48 C-34 -72 -2 -72 0 -48 C10 -75 42 -66 45 -38" fill="none" stroke="#845d38" stroke-width="7" stroke-linecap="round"/>
    <ellipse cx="-18" cy="-2" rx="43" ry="54" fill="#ef7768"/>
    <ellipse cx="18" cy="-2" rx="43" ry="54" fill="#e95c50"/>
    <ellipse cx="0" cy="-8" rx="45" ry="58" fill="#f58670"/>
    <ellipse cx="-15" cy="-24" rx="13" ry="22" fill="#ffd6ac" opacity=".5"/>
    <path d="M9 -61 C34 -84 65 -62 53 -42 C32 -40 17 -45 9 -61Z" fill="#8fcf9b"/>
    ${eye(-12, 5)}${eye(16, 5)}
    <path d="M-11 25 Q0 35 12 25" fill="none" stroke="#61413b" stroke-width="4" stroke-linecap="round"/>
  `);

  if (slug === "my-cat") return T(`
    <ellipse cx="0" cy="35" rx="47" ry="48" fill="#b79473"/>
    <path d="M-46 -22 L-31 -62 L-14 -25Z" fill="#a78365"/>
    <path d="M46 -22 L31 -62 L14 -25Z" fill="#a78365"/>
    <path d="M-34 -25 L-29 -49 L-18 -26Z" fill="#f5b0a0"/>
    <path d="M34 -25 L29 -49 L18 -26Z" fill="#f5b0a0"/>
    <ellipse cx="0" cy="-3" rx="52" ry="48" fill="#bd9877"/>
    <ellipse cx="0" cy="12" rx="34" ry="31" fill="#f3dfc8"/>
    ${eye(-17, -4, 6)}${eye(17, -4, 6)}
    <path d="M-5 13 L5 13 L0 21Z" fill="#e58f88"/>
    <path d="M-17 24 Q-5 31 0 22 Q5 31 17 24" fill="none" stroke="#645048" stroke-width="3" stroke-linecap="round"/>
    <path d="M-45 9 L-72 2 M-45 18 L-73 20 M45 9 L72 2 M45 18 L73 20" stroke="#6d584f" stroke-width="3" stroke-linecap="round"/>
  `);

  if (slug === "the-sun") return T(`
    <g stroke="#f4bc55" stroke-width="10" stroke-linecap="round">
      <line x1="0" y1="-76" x2="0" y2="-104"/><line x1="0" y1="76" x2="0" y2="104"/>
      <line x1="-76" y1="0" x2="-104" y2="0"/><line x1="76" y1="0" x2="104" y2="0"/>
      <line x1="-54" y1="-54" x2="-75" y2="-75"/><line x1="54" y1="-54" x2="75" y2="-75"/>
      <line x1="-54" y1="54" x2="-75" y2="75"/><line x1="54" y1="54" x2="75" y2="75"/>
    </g>
    <circle cx="0" cy="0" r="58" fill="#ffd36d"/>
    <circle cx="-16" cy="-16" r="18" fill="#ffe9a9" opacity=".55"/>
    ${eye(-18, -4, 6)}${eye(18, -4, 6)}
    <path d="M-18 19 Q0 32 20 19" fill="none" stroke="#8b6540" stroke-width="5" stroke-linecap="round"/>
  `);

  if (slug === "my-dog") return T(`
    <ellipse cx="0" cy="28" rx="56" ry="52" fill="#d8a97d"/>
    <ellipse cx="-47" cy="-2" rx="19" ry="43" fill="#9e775c" transform="rotate(18 -47 -2)"/>
    <ellipse cx="47" cy="-2" rx="19" ry="43" fill="#9e775c" transform="rotate(-18 47 -2)"/>
    <ellipse cx="0" cy="0" rx="50" ry="44" fill="#dfb183"/>
    <ellipse cx="0" cy="21" rx="29" ry="23" fill="#fff0d8"/>
    ${eye(-17, -5, 6)}${eye(17, -5, 6)}
    <ellipse cx="0" cy="17" rx="9" ry="7" fill="#3d3835"/>
    <path d="M-14 29 Q0 39 14 29" fill="none" stroke="#665044" stroke-width="4" stroke-linecap="round"/>
    <circle cx="-34" cy="16" r="8" fill="#f5a99a" opacity=".55"/><circle cx="34" cy="16" r="8" fill="#f5a99a" opacity=".55"/>
  `);

  if (slug === "the-ball") return T(`
    <circle cx="0" cy="7" r="62" fill="#7eb8e8"/>
    <path d="M-54 -24 C-14 -2 12 -2 54 -24" fill="none" stroke="#fff7e8" stroke-width="10" stroke-linecap="round"/>
    <path d="M-54 37 C-16 17 15 17 54 37" fill="none" stroke="#fff7e8" stroke-width="10" stroke-linecap="round"/>
    <path d="M-20 -52 C-5 -13 -5 26 -20 62" fill="none" stroke="#f5a36f" stroke-width="10" stroke-linecap="round"/>
    <path d="M27 -48 C7 -14 7 27 27 57" fill="none" stroke="#f5a36f" stroke-width="10" stroke-linecap="round"/>
    <ellipse cx="-19" cy="-19" rx="17" ry="26" fill="#ffffff" opacity=".34"/>
  `);

  if (slug === "the-big-tree") return T(`
    <path d="M-9 26 C-10 -15 -5 -36 8 -67 C14 -41 19 -14 17 27 L29 77 L-27 77Z" fill="#9b704f"/>
    <circle cx="-36" cy="-42" r="36" fill="#91ce92"/><circle cx="3" cy="-64" r="45" fill="#7fc184"/>
    <circle cx="43" cy="-36" r="38" fill="#9ad69c"/><circle cx="-7" cy="-24" r="44" fill="#88c98a"/>
    <circle cx="-23" cy="-44" r="12" fill="#fff5d6" opacity=".34"/>
    <circle cx="-28" cy="19" r="6" fill="#f3a678"/><circle cx="22" cy="5" r="5" fill="#f3a678"/>
  `);

  if (slug === "my-room") return T(`
    <rect x="-88" y="4" width="176" height="78" rx="12" fill="#f1d4bd"/>
    <rect x="-78" y="-47" width="68" height="56" rx="8" fill="#b8dce6" stroke="#fff9ef" stroke-width="5"/>
    <line x1="-44" y1="-45" x2="-44" y2="8" stroke="#fff9ef" stroke-width="3"/>
    <line x1="-76" y1="-18" x2="-12" y2="-18" stroke="#fff9ef" stroke-width="3"/>
    <rect x="12" y="-2" width="72" height="50" rx="12" fill="#99d1a4"/>
    <rect x="25" y="28" width="47" height="28" rx="5" fill="#fff3df"/>
    <circle cx="48" cy="-20" r="19" fill="#ffd06a"/>
    <rect x="-64" y="37" width="64" height="28" rx="10" fill="#f5a36f"/>
    <rect x="-57" y="20" width="51" height="21" rx="5" fill="#fff1dd"/>
  `);

  if (slug === "the-fish") return T(`
    <path d="M45 0 L93 -34 L93 34Z" fill="#f59a63"/>
    <ellipse cx="-10" cy="0" rx="70" ry="42" fill="#ffd05d"/>
    <path d="M-35 -34 L-7 -68 L9 -29Z" fill="#f59a63"/>
    <path d="M-30 36 L2 66 L8 28Z" fill="#f59a63"/>
    ${eye(29, -9, 6)}
    <path d="M12 13 Q27 24 41 12" fill="none" stroke="#8b6540" stroke-width="4" stroke-linecap="round"/>
    <path d="M-73 -10 Q-38 13 -72 36" fill="none" stroke="#fff8db" stroke-width="6" opacity=".55"/>
    <circle cx="-80" cy="-45" r="7" fill="#ffffff" opacity=".55"/><circle cx="-59" cy="-64" r="4" fill="#ffffff" opacity=".5"/>
  `);

  if (slug === "i-can-move") return T(`
    <circle cx="0" cy="-38" r="33" fill="#ffd06d"/>
    ${eye(-11, -42, 4)}${eye(11, -42, 4)}
    <path d="M-12 -27 Q0 -18 13 -27" fill="none" stroke="#8b6540" stroke-width="3" stroke-linecap="round"/>
    <line x1="0" y1="-5" x2="0" y2="45" stroke="#8caee8" stroke-width="18" stroke-linecap="round"/>
    <line x1="-7" y1="8" x2="-55" y2="-15" stroke="#8caee8" stroke-width="13" stroke-linecap="round"/>
    <line x1="7" y1="8" x2="57" y2="-18" stroke="#8caee8" stroke-width="13" stroke-linecap="round"/>
    <line x1="-4" y1="43" x2="-34" y2="76" stroke="#6d96d8" stroke-width="13" stroke-linecap="round"/>
    <line x1="4" y1="43" x2="42" y2="67" stroke="#6d96d8" stroke-width="13" stroke-linecap="round"/>
    <path d="M-71 -22 C-82 -3 -80 8 -66 20 M72 -26 C85 -8 83 7 67 21" fill="none" stroke="#f3a678" stroke-width="5" stroke-linecap="round"/>
  `);

  return T(`
    <ellipse cx="-6" cy="9" rx="66" ry="45" fill="#fff8eb"/>
    <ellipse cx="-28" cy="-32" rx="38" ry="31" fill="#fff8eb"/>
    <ellipse cx="-51" cy="-36" rx="18" ry="25" fill="#6c5b52" transform="rotate(-22 -51 -36)"/>
    <ellipse cx="-4" cy="-36" rx="18" ry="25" fill="#6c5b52" transform="rotate(22 -4 -36)"/>
    <path d="M-53 -10 C-44 -37 -24 -44 -5 -28 C9 -16 7 5 -11 12Z" fill="#7b6659" opacity=".9"/>
    <ellipse cx="-29" cy="-18" rx="28" ry="20" fill="#f0c3ba"/>
    ${eye(-39, -33, 5)}${eye(-16, -33, 5)}
    <circle cx="-38" cy="-17" r="4" fill="#5b4942"/><circle cx="-18" cy="-17" r="4" fill="#5b4942"/>
    <path d="M-36 -5 Q-29 2 -21 -5" fill="none" stroke="#6d5148" stroke-width="3" stroke-linecap="round"/>
    <circle cx="18" cy="0" r="20" fill="#6c5b52"/><circle cx="43" cy="20" r="15" fill="#6c5b52"/>
    <line x1="-44" y1="45" x2="-44" y2="76" stroke="#c8a88a" stroke-width="10" stroke-linecap="round"/>
    <line x1="26" y1="45" x2="26" y2="76" stroke="#c8a88a" stroke-width="10" stroke-linecap="round"/>
  `);
}

function icon(kind, active) {
  const col = active ? "#db7f58" : "#b8b1aa";
  if (kind === "book") return `<path d="M-12 -10 C-5 -13 0 -11 0 -6 V13 C-5 10 -9 10 -12 12Z M0 -6 C5 -11 10 -13 12 -10 V12 C9 10 5 10 0 13Z" fill="none" stroke="${col}" stroke-width="2.6" stroke-linejoin="round"/>`;
  if (kind === "spark") return `<path d="M0 -13 L4 -3 L14 0 L4 3 L0 13 L-4 3 L-14 0 L-4 -3Z" fill="${col}"/>`;
  return `<circle cx="0" cy="-4" r="7" fill="none" stroke="${col}" stroke-width="2.6"/><path d="M-12 13 C-8 4 8 4 12 13" fill="none" stroke="${col}" stroke-width="2.6" stroke-linecap="round"/>`;
}

function render(story, index) {
  const other = stories.filter((s) => s.slug !== story.slug).slice(index % 2, index % 2 + 3);
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs>
  ${blob(story.slug, story.bg)}
  <filter id="softShadow" x="-30%" y="-30%" width="160%" height="170%">
    <feDropShadow dx="0" dy="10" stdDeviation="9" flood-color="#9a7c61" flood-opacity=".13"/>
  </filter>
  <filter id="tinyShadow" x="-25%" y="-25%" width="150%" height="150%">
    <feDropShadow dx="0" dy="5" stdDeviation="5" flood-color="#9a7c61" flood-opacity=".10"/>
  </filter>
</defs>
<rect width="${W}" height="${H}" fill="#fbf4ed"/>
<ellipse cx="132" cy="72" rx="230" ry="118" fill="${story.bg[0]}" opacity=".78"/>
<ellipse cx="638" cy="56" rx="190" ry="102" fill="#ffffff" opacity=".72"/>
<ellipse cx="640" cy="364" rx="210" ry="88" fill="${story.bg[1]}" opacity=".62"/>

<g transform="translate(36 22)">
  <rect x="0" y="0" width="678" height="376" rx="34" fill="#fffdf9" filter="url(#softShadow)"/>
  <rect x="0" y="0" width="678" height="376" rx="34" fill="url(#bg-${story.slug})" opacity=".42"/>
  <rect x="18" y="18" width="642" height="340" rx="26" fill="#fffdf9" opacity=".82"/>

  <g transform="translate(44 40)">
    <text x="0" y="0" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Rounded', Arial, sans-serif" font-size="18" font-weight="700" fill="#393b3f">Good morning</text>
    <text x="0" y="32" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Rounded', Arial, sans-serif" font-size="31" font-weight="800" fill="#2f3136">Little stories</text>
    <text x="0" y="58" font-family="-apple-system, BlinkMacSystemFont, Arial, sans-serif" font-size="13" fill="#9a938c">Warm reading for tiny English steps.</text>

    <g transform="translate(0 84)">
      <rect x="0" y="0" width="72" height="34" rx="17" fill="${story.accent}" opacity=".95"/>
      <text x="36" y="22" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, Arial, sans-serif" font-size="13" font-weight="700" fill="#fffdf8">L1 Seed</text>
      <rect x="82" y="0" width="70" height="34" rx="17" fill="#ffffff" stroke="#eee4da"/>
      <text x="117" y="22" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, Arial, sans-serif" font-size="13" font-weight="700" fill="#8f8982">L2 Leaf</text>
      <rect x="162" y="0" width="72" height="34" rx="17" fill="#ffffff" stroke="#eee4da"/>
      <text x="198" y="22" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, Arial, sans-serif" font-size="13" font-weight="700" fill="#8f8982">L3 Bird</text>
    </g>

    <g transform="translate(0 142)">
      <text x="0" y="0" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Rounded', Arial, sans-serif" font-size="17" font-weight="800" fill="#383b40">Recent Reading</text>
      <rect x="0" y="16" width="250" height="86" rx="20" fill="#ffffff" filter="url(#tinyShadow)"/>
      ${bookCover(story, 14, 28, 64, 62, true)}
      <text x="94" y="48" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Rounded', Arial, sans-serif" font-size="17" font-weight="800" fill="#35383d">${esc(story.title)}</text>
      <text x="94" y="72" font-family="-apple-system, BlinkMacSystemFont, Arial, sans-serif" font-size="12" font-weight="700" fill="#a09a93">${esc(story.level)} · 6 min</text>
      <rect x="94" y="84" width="116" height="5" rx="3" fill="#f0e6dc"/>
      <rect x="94" y="84" width="${66 + (index % 4) * 12}" height="5" rx="3" fill="${story.accent}"/>
    </g>
  </g>

  <g transform="translate(330 34)">
    ${bookCover(story, 0, 0, 138, 188)}
    <g transform="translate(162 6)">
      <text x="0" y="8" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Rounded', Arial, sans-serif" font-size="18" font-weight="800" fill="#373a3f">Story Covers</text>
      ${other.map((s, i) => `
      <g transform="translate(0 ${32 + i * 68})">
        <rect x="0" y="0" width="158" height="54" rx="16" fill="#ffffff" filter="url(#tinyShadow)"/>
        ${bookCover(s, 8, 8, 38, 38, true)}
        <text x="56" y="22" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Rounded', Arial, sans-serif" font-size="13" font-weight="800" fill="#3d4045">${esc(s.title)}</text>
        <text x="56" y="40" font-family="-apple-system, BlinkMacSystemFont, Arial, sans-serif" font-size="10" font-weight="700" fill="#aaa29b">${esc(s.level)}</text>
      </g>`).join("")}
    </g>
  </g>

  <g transform="translate(44 250)">
    <rect x="0" y="0" width="590" height="42" rx="21" fill="#fffaf4" stroke="#efe5db" filter="url(#tinyShadow)"/>
    <g transform="translate(82 21)">${icon("book", true)}<text x="22" y="5" font-family="-apple-system, BlinkMacSystemFont, Arial, sans-serif" font-size="12" font-weight="800" fill="#db7f58">Stories</text></g>
    <g transform="translate(286 21)">${icon("spark", false)}<text x="22" y="5" font-family="-apple-system, BlinkMacSystemFont, Arial, sans-serif" font-size="12" font-weight="700" fill="#b8b1aa">Words</text></g>
    <g transform="translate(490 21)">${icon("user", false)}<text x="22" y="5" font-family="-apple-system, BlinkMacSystemFont, Arial, sans-serif" font-size="12" font-weight="700" fill="#b8b1aa">Me</text></g>
  </g>
</g>
</svg>`;
}

fs.mkdirSync(OUT_DIR, { recursive: true });

function convertSvgToJpg(svgPath, jpgPath) {
  const pngPath = jpgPath.replace(/\.jpg$/, ".png");
  const htmlPath = jpgPath.replace(/\.jpg$/, ".html");
  const svgMarkup = fs.readFileSync(svgPath, "utf8");
  fs.writeFileSync(htmlPath, `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;width:${W}px;height:${H}px;overflow:hidden;background:#fbf4ed;}svg{display:block;width:${W}px;height:${H}px;}</style></head><body>${svgMarkup}</body></html>`);
  execFileSync(CHROME, [
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    "--no-first-run",
    "--no-default-browser-check",
    `--window-size=${W},${H}`,
    "--force-device-scale-factor=1",
    `--screenshot=${pngPath}`,
    `file://${htmlPath}`,
  ], { stdio: "pipe" });

  for (const quality of ["80", "72", "64"]) {
    execFileSync("sips", ["-s", "format", "jpeg", "-s", "formatOptions", quality, pngPath, "--out", jpgPath], { stdio: "pipe" });
    if (fs.statSync(jpgPath).size <= 100 * 1024) break;
  }
}

for (let i = 0; i < stories.length; i++) {
  const story = stories[i];
  const svgPath = path.join(OUT_DIR, `${story.slug}.svg`);
  const jpgPath = path.join(OUT_DIR, `${story.slug}.jpg`);
  fs.writeFileSync(svgPath, render(story, i));
  convertSvgToJpg(svgPath, jpgPath);
  const finalSize = fs.statSync(jpgPath).size;
  console.log(`${path.relative(process.cwd(), jpgPath)} ${Math.round(finalSize / 1024)}KB ${titleCase(story.slug)}`);
}
