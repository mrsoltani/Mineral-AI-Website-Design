// ساخت سایت استاتیک: node build.mjs  → خروجی در پوشه dist
import { mkdirSync, writeFileSync, cpSync, rmSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { buildSync } from 'esbuild';
import fa from './content/fa.mjs';

const SITE = 'https://www.sarinapars.com';
const OUT = 'dist';
mkdirSync(OUT, { recursive: true });
for (const f of readdirSync(OUT)) rmSync(join(OUT, f), { recursive: true, force: true });
cpSync('src/css', join(OUT, 'assets/css'), { recursive: true });
mkdirSync(join(OUT, 'assets/js'), { recursive: true });
cpSync('src/js/main.js', join(OUT, 'assets/js/main.js'));
buildSync({ entryPoints: ['src/js/gl.src.js'], bundle: true, minify: true, format: 'esm', target: 'es2019', outfile: join(OUT, 'assets/js/gl.js') });
cpSync('src/fonts', join(OUT, 'assets/fonts'), { recursive: true });
// فونت‌ها نسبت به css: ../fonts و ../assets → در dist با یک سطح بالاتر هماهنگ می‌شوند
cpSync('src/fonts', join(OUT, 'assets/fonts'), { recursive: true });
cpSync('src/assets', join(OUT, 'assets/assets'), { recursive: true });

const e = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const A = '/assets';
const V = Date.now().toString(36); // جلوگیری از کش قدیمی مرورگر

const icons = {
  arrow: '<svg class="arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
  loop: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12a8 8 0 0 1 14-5.3M20 12a8 8 0 0 1-14 5.3"/><path d="M18 3v4h-4M6 21v-4h4"/></svg>',
  ai: '<path d="M12 3l2.2 5.8L20 11l-5.8 2.2L12 19l-2.2-5.8L4 11l5.8-2.2z"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>',
  coin: '<circle cx="12" cy="12" r="9"/><path d="M14.5 9.2c-.6-.8-1.5-1.2-2.5-1.2-1.4 0-2.5.8-2.5 2s1 1.7 2.5 2 2.5.8 2.5 2-1.1 2-2.5 2c-1 0-1.900-.4-2.500-1.200M12 6.500V8M12 16v1.500"/>',
  cart: '<path d="M3 4h2.500l2 11h10l2-8H7"/><circle cx="9" cy="19.500" r="1.200"/><circle cx="17" cy="19.500" r="1.200"/>',
  db: '<ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v6c0 1.700 3.100 3 7 3s7-1.300 7-3V6M5 12v6c0 1.700 3.100 3 7 3s7-1.300 7-3v-6"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.500"/>',
  drill: '<path d="M12 3v14M9 3h6M10 17l2 4 2-4z"/><path d="M5 9h3M16 12h3M5 15h3"/>',
  layers: '<path d="M12 4l9 5-9 5-9-5zM3 14l9 5 9-5"/>',
  chart: '<path d="M4 20V4M4 20h16"/><path d="M8 15l4-4 3 3 5-6"/>',
};
const icon = (n) => `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[n]}</svg>`;

function header(L, current) {
  const links = L.nav.map(([t, h]) => `<a href="${h}"${h === current ? ' aria-current="page"' : ''}>${e(t)}</a>`).join('');
  return `<header class="site-header"><div class="progress" aria-hidden="true"></div><div class="container">
<a class="brand" href="/" aria-label="${e(L.company)}"><img src="${A}/assets/logo-fa-light.svg" alt="${e(L.company)}" width="130" height="46"></a>
<nav class="nav" id="nav" aria-label="منوی اصلی">${links}</nav>
<div class="header-tools"><a class="lang" href="${L.ui.otherHref}" hreflang="en" lang="en">${L.ui.other}</a><a class="btn btn--gold" href="${L.navCta[1]}">${e(L.navCta[0])}</a>
<button class="menu-toggle" aria-label="${e(L.ui.menu)}" aria-expanded="false" aria-controls="nav">${icons.menu}</button></div>
</div></header>`;
}

function footer(L) {
  const f = L.footer;
  const links = L.nav.map(([t, h]) => `<li><a href="${h}">${e(t)}</a></li>`).join('');
  return `<footer class="site-footer"><div class="pattern pattern--end" aria-hidden="true"><img src="${A}/assets/pattern-fa.svg" alt=""></div><div class="container">
<div class="footer-grid">
<div><img src="${A}/assets/logo-fa-light.svg" alt="${e(L.company)}" width="150" height="56"><p>${e(f.about)}</p></div>
<div><h4>${e(f.links)}</h4><ul>${links}</ul></div>
<div><h4>${e(f.contact)}</h4><address>${e(f.address)}<br>
<a href="tel:${f.phoneRaw}">${f.phone}</a> · <a href="tel:${f.mobileRaw}">${f.mobile}</a><br>
<a href="mailto:${f.email}">${f.email}</a> · <a href="${SITE}">www.sarinapars.com</a></address></div>
</div>
<div class="legal"><span>${e(f.reg)}</span><span>${e(f.copy)}</span></div>
</div></footer>`;
}

function ctaBlock(L, withForm) {
  const c = L.cta, f = L.form;
  const form = withForm ? `<form class="form" data-ok="${e(L.ui.formOk)}" data-err="${e(L.ui.formErr)}" novalidate>
<div class="two"><label>${e(f.name)}<input name="name" autocomplete="name" required></label>
<label>${e(f.contact)}<input name="contact" autocomplete="email" required></label></div>
<label>${e(f.msg)}<textarea name="message" rows="4" required></textarea></label>
<div class="hp" aria-hidden="true"><label>Website<input name="website" tabindex="-1" autocomplete="off"></label></div>
<button class="btn btn--gold" type="submit" style="justify-self:start">${e(f.send)}${icons.arrow}</button>
<p class="form-msg" role="status"></p></form>` : `<div class="btn-row"><a class="btn btn--gold" href="/about/">${e(c.btn)}${icons.arrow}</a></div>`;
  return `<section class="section section--dark cta" id="cta"><div class="pattern pattern--start" aria-hidden="true"><img src="${A}/assets/pattern-fa.svg" alt=""></div>
<div class="container"><h2 class="reveal">${e(c.title)}</h2><p class="muted reveal">${e(c.text)}</p>${form}</div></section>`;
}

function page(L, { path, title, desc, body }) {
  const ld = {
    '@context': 'https://schema.org', '@type': 'Organization', name: L.company, url: SITE,
    logo: `${SITE}/assets/assets/logo-fa.svg`, email: L.footer.email, telephone: '+982145237000',
    address: { '@type': 'PostalAddress', streetAddress: 'سعادت‌آباد، بلوار مدیریت، مجتمع رویال سنتر، طبقه چهارم، واحد ۴۰۲', addressLocality: 'تهران', addressCountry: 'IR' },
  };
  const html = `<!doctype html>
<html lang="${L.lang}" dir="${L.dir}" class="no-js">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${e(title)}</title>
<meta name="description" content="${e(desc)}">
<link rel="canonical" href="${SITE}${path}">
<link rel="alternate" hreflang="fa" href="${SITE}${path}"><link rel="alternate" hreflang="en" href="${SITE}/en${path}">
<meta property="og:type" content="website"><meta property="og:title" content="${e(title)}"><meta property="og:description" content="${e(desc)}"><meta property="og:url" content="${SITE}${path}"><meta property="og:locale" content="fa_IR">
<meta name="theme-color" content="#0B1533">
<link rel="icon" href="${A}/assets/logo-fa.svg" type="image/svg+xml">
<link rel="preload" href="${A}/fonts/vazirmatn-arabic-wght-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${A}/css/main.css?v=${V}">
<script type="application/ld+json">${JSON.stringify(ld)}</script>
</head>
<body>
<a class="skip" href="#main">${e(L.ui.skip)}</a>
${header(L, path)}
<main id="main">${body}</main>
${footer(L)}
<script src="${A}/js/main.js?v=${V}" defer></script>
<script type="module" src="${A}/js/gl.js?v=${V}"></script>
</body></html>`;
  const file = join(OUT, path, 'index.html');
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, html);
}

const accent = (t) => { let i = 0; return e(t).split(/(\*[^*]+\*)/).map((part) => part.startsWith('*') ? `<em>${part.slice(1, -1).split(' ').map((w) => `<span class="w" style="--i:${i++}">${w}</span>`).join(' ')}</em>` : part.split(' ').filter(Boolean).map((w) => `<span class="w" style="--i:${i++}">${w}</span>`).join(' ')).join(' '); };
const glCanvas = (L, m) => `<canvas data-gl="${m}" class="gl-canvas" data-labels='${JSON.stringify(L.geoLabels)}' aria-hidden="true"></canvas>`;
const marquee = (L) => { const it = L.marquee.map((x) => `<span>${e(x)}</span>`).join(''); return `<div class="marquee" aria-hidden="true"><div class="marquee-track">${it}${it}</div></div>`; };
const model = (n, cls = '', drag = false) => `<canvas data-model="${n}" class="model ${cls}"${drag ? ' data-drag="1"' : ''} aria-hidden="true"></canvas>`;
const btn = (b, cls) => `<a class="btn ${cls}" href="${b[1]}">${e(b[0])}${icons.arrow}</a>`;
const head = (x, extra = '') => `<div class="sec-head reveal"><span class="eyebrow">${e(x.eyebrow)}</span><h2>${e(x.h2)}</h2>${extra}</div>`;

// ===== خانه =====
function home(L) {
  const h = L.home;
  const cards = h.intro.cards.map(([t, p, href, tag, ic]) => `<a class="card reveal" href="${href}">${icon(ic)}${tag ? `<span class="tag">${e(tag)}</span>` : ''}<h3>${e(t)}</h3><p class="muted">${e(p)}</p><span class="more">${e(h.intro.more)}${icons.arrow}</span></a>`).join('');
  const why = h.why.items.map(([t, p], i) => `<div class="card has-model reveal">${model(['target', 'layers', 'chart'][i], 'model--card')}<span class="step"><span class="num">۰${'۱۲۳'[i]}</span></span><h3>${e(t)}</h3><p class="muted">${e(p)}</p></div>`).join('');
  const body = `
<section class="hero"><canvas data-geo="hero" aria-hidden="true"></canvas>${glCanvas(L, 'hero')}<div class="scroll-hint" aria-hidden="true"><i></i></div>
<div class="container"><span class="eyebrow">${e(h.hero.eyebrow)}</span><h1 class="hl">${accent(h.hero.h1)}</h1><p class="lead">${e(h.hero.lead)}</p>
<div class="btn-row">${btn(h.hero.b1, 'btn--gold')}${btn(h.hero.b2, 'btn--ghost')}</div></div></section>
${marquee(L)}
<section class="section section--paper"><div class="pattern pattern--end" aria-hidden="true"><img src="${A}/assets/pattern-fa.svg" alt=""></div><div class="container">
${head(h.intro, `<p class="lead muted">${e(h.intro.p)}</p>`)}
<div class="grid grid--3">${cards}</div></div></section>
<section class="section section--dark"><div class="container split">
<div class="reveal"><span class="eyebrow">${e(h.ai.eyebrow)}</span><h2>${e(h.ai.h2)}</h2><p class="lead muted">${e(h.ai.p)}</p>
<ul class="list-check">${h.ai.points.map((x) => `<li>${e(x)}</li>`).join('')}</ul>
<div class="btn-row">${btn(h.ai.btn, 'btn--gold')}</div></div>
<div class="visual reveal" role="img" aria-label="برش انتزاعی از لایه‌های زمین با ابر احتمال کانه‌زایی و مسیر گمانه‌ها"><canvas data-geo="mini"></canvas>${glCanvas(L, 'mini')}</div>
</div></section>
<section class="section section--white"><div class="container">${head(h.why)}<div class="grid grid--3">${why}</div></div></section>
${ctaBlock(L, false)}`;
  page(L, { path: '/', title: h.title, desc: h.desc, body });
}

// ===== هوش مصنوعی =====
function ai(L) {
  const a = L.ai;
  const problem = a.problem.cards.map(([t, p]) => `<div class="card reveal"><h3>${e(t)}</h3><p class="muted">${e(p)}</p></div>`).join('');
  const cmpRows = a.compare.rows.map(([x, y]) => `<div class="compare-row"><div>${e(x)}</div><div>${e(y)}</div></div>`).join('');
  const steps = a.how.steps.map(([n, t, p], i) => `<div class="step" data-stage="${i}"><span class="num">${n}</span><h3>${e(t)}</h3><p class="muted">${e(p)}</p></div>`).join('');
  const caps = a.caps.cards.map(([t, p, li, mk]) => `<div class="card has-model reveal">${model(mk, 'model--card')}<h3>${e(t)}</h3><p class="muted">${e(p)}</p><ul>${li.map((x) => `<li>${e(x)}</li>`).join('')}</ul></div>`).join('');
  const chain = a.chain.items.map((x) => `<li>${e(x)}</li>`).join('');
  const faq = a.faq.items.map(([q, r]) => `<details><summary>${e(q)}</summary><p>${e(r)}</p></details>`).join('');
  const fa = (n) => String(n).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d]);
  const stats = a.stats.map(([n, t]) => `<li class="reveal"><b>${n}</b><span>${e(t)}</span></li>`).join('');
  const goals = a.vision.goals.map(([t, p], i) => `<div class="card reveal"><span class="num">${fa('0' + (i + 1))}</span><h3>${e(t)}</h3><p class="muted">${e(p)}</p></div>`).join('');
  const prin = a.principles.items.map(([t, p], i) => `<li class="reveal"><span class="pn">${fa(i + 1)}</span><div><h3>${e(t)}</h3><p class="muted">${e(p)}</p></div></li>`).join('');
  const pa = a.path;
  const stat = pa.status.map(([k, t, c]) => `<li class="st st--${c} reveal"><span class="st-k">${e(k)}</span><span>${e(t)}</span></li>`).join('');
  const phases = pa.phases.map(([n, t, i, o], idx) => `<div class="phase reveal"><div class="phase-h"><small>${e(n)}</small><h3>${e(t)}</h3></div><div class="phase-b"><b>${e(pa.inLbl)}</b><p>${e(i)}</p><b>${e(pa.outLbl)}</b><p>${e(o)}</p></div></div>${idx < 2 ? `<div class="gate reveal" aria-hidden="true"><i></i><span>${e(pa.gate)}</span></div>` : ''}`).join('');
  const kpis = a.kpi.items.map(([t, p], i) => `<div class="kpi reveal"><span class="pn">${fa(i + 1)}</span><h3>${e(t)}</h3><p class="muted">${e(p)}</p></div>`).join('');
  const dots = a.decision.items.map(([t, c]) => `<li><i class="dot dot--${c}"></i>${e(t)}</li>`).join('');
  const body = `
<section class="hero"><canvas data-geo="hero" aria-hidden="true"></canvas>${glCanvas(L, 'hero')}<div class="scroll-hint" aria-hidden="true"><i></i></div>
<div class="container"><span class="eyebrow">${e(a.hero.eyebrow)}</span><h1 class="hl">${accent(a.hero.h1)}</h1><p class="lead" style="font-size:1.35rem;color:#fff;font-weight:600">${e(a.hero.sub)}</p><p class="lead">${e(a.hero.lead)}</p><p class="hero-status"><i></i>${e(a.hero.status)}</p>
<div class="btn-row">${btn(a.hero.b1, 'btn--gold')}${btn(a.hero.b2, 'btn--ghost')}</div></div></section>
${marquee(L)}
<div class="statsbar"><div class="container"><ul>${stats}</ul></div></div>
<section class="section section--white" id="vision"><div class="container">${head(a.vision, `<p class="lead muted">${e(a.vision.p)}</p>`)}<div class="grid grid--4 goals">${goals}</div></div></section>
<section class="section section--paper"><div class="container">${head(a.problem)}<div class="problem-grid"><div class="problem-cards">${problem}</div><div class="model-wrap model-wrap--tall reveal">${model('rig')}<span class="model-cap">${e(a.problem.cap)}</span></div></div></div></section>
<section class="section section--dark"><div class="pattern pattern--end" aria-hidden="true"><img src="${A}/assets/pattern-fa.svg" alt=""></div><div class="container">${head(a.compare)}
<div class="grid grid--2 compare-models reveal"><div class="model-wrap">${model('conv')}<span class="model-cap">${e(a.compare.head[0])}</span></div><div class="model-wrap model-wrap--gold">${model('ours')}<span class="model-cap">${e(a.compare.head[1])}</span></div></div>
<div class="compare reveal"><div class="compare-row compare-head"><div>${e(a.compare.head[0])}</div><div>${e(a.compare.head[1])}</div></div>${cmpRows}</div></div></section>
<section class="section section--navy how" id="how"><div class="container">${head(a.how)}
<div class="how-grid"><div class="how-stage"><div class="how-sticky"><canvas data-geo="mini" aria-hidden="true"></canvas>${glCanvas(L, 'how')}</div></div>
<div class="how-steps">${steps}<div class="loop reveal">${icons.loop}<span>${e(a.how.loop)}</span></div><p class="note-small">${e(a.how.expert)}</p></div></div></div></section>
<section class="section section--dark"><div class="container"><div class="sec-head sec-head--center reveal"><span class="eyebrow">${e(a.block.eyebrow)}</span><h2>${e(a.block.h2)}</h2><p class="lead muted">${e(a.block.p)}</p></div>
<div class="model-wrap model-wrap--feature reveal">${model('voxel', '', true)}<span class="model-cap">${e(a.block.hint)}</span></div>
<ul class="pills reveal">${a.block.points.map((x) => `<li>${e(x)}</li>`).join('')}</ul></div></section>
<section class="section section--white"><div class="container">${head(a.principles)}<ol class="principles">${prin}</ol></div></section>
<section class="section section--paper" id="caps"><div class="container">${head(a.caps)}<div class="grid grid--4">${caps}</div></div></section>
<section class="section section--dark"><div class="container split"><div class="model-wrap reveal">${model('tree', '', true)}</div>
<div class="reveal"><span class="eyebrow">${e(a.decision.eyebrow)}</span><h2>${e(a.decision.h2)}</h2><p class="lead muted">${e(a.decision.p)}</p><ul class="dots">${dots}</ul></div></div></section>
<section class="section section--navy"><div class="container split"><div class="reveal"><span class="eyebrow">${e(a.target.eyebrow)}</span><h2>${e(a.target.h2)}</h2><p class="lead muted">${e(a.target.p)}</p></div>
<div class="model-wrap reveal">${model('topo', '', true)}</div></div></section>
<section class="section section--dark"><div class="container split"><div class="model-wrap reveal">${model('datastack', 'model--sq', true)}</div>
<div class="reveal"><span class="eyebrow">${e(a.data.eyebrow)}</span><h2>${e(a.data.h2)}</h2><p class="lead muted">${e(a.data.p)}</p></div></div></section>
<section class="section section--white"><div class="container">${head(a.chain)}<div class="model-wrap model-wrap--wide reveal">${model('chain')}</div><ol class="chain reveal">${chain}</ol></div></section>
<section class="section section--dark" id="path"><div class="container">${head(pa, `<p class="lead muted">${e(pa.p)}</p>`)}<ul class="status-row">${stat}</ul><div class="phases">${phases}</div></div></section>
<section class="section section--paper"><div class="container">${head(a.kpi, `<p class="lead muted">${e(a.kpi.p)}</p>`)}<div class="kpis">${kpis}</div></div></section>
<section class="section section--white"><div class="container faq-wrap">${head(a.faq)}<div class="faq reveal">${faq}</div></div></section>
${ctaBlock(L, false)}`;
  page(L, { path: '/ai/', title: a.title, desc: a.desc, body });
}

// ===== نمونه اولیه مدل‌های سه‌بعدی (فقط برای بازبینی) =====
function protoPage(L) {
  const M = [
    ['voxel', 'مدل بلوکی منابع', 'وکسل‌های رنگی بر اساس عیار؛ صفحه برش از میان بلوک می‌گذرد.', ''],
    ['traces', 'گمانه‌ها و عیار', 'گمانه‌ها یکی‌یکی به پایین می‌روند؛ هر قطعه به رنگ و ضخامت عیار.', ''],
    ['shells', 'عدم قطعیت', 'پوسته‌های تو در تو: کمینه، محتمل و بیشینه، با تغییر شکل زنده.', ''],
    ['datastack', 'یکپارچه‌سازی داده', 'چهار لایه داده (نقشه، ژئوشیمی، ژئوفیزیک، لاگ) به یک مدل می‌رسند.', ''],
    ['tree', 'نقاط کنترل تصمیم', 'ادامه، تغییر مسیر یا توقف؛ پالس‌ها در مسیر تصمیم حرکت می‌کنند.', ''],
    ['topo', 'انتخاب هدف روی زمین', 'خطوط تراز، رادار و اهداف رتبه‌بندی‌شده (ارتفاع میله = ارزش).', ''],
    ['rig', 'دستگاه حفاری', 'دکل خرپایی، رشته حفاری، مغزه‌ها و بخش مقطع زمین.', ''],
    ['surface', 'ماتریس ارزش و ریسک', 'ستون‌های سه‌بعدی و مسیر صعود به بهترین تصمیم.', ''],
    ['datacenter', 'مرکز داده یکپارچه', 'منابع پراکنده به یک پایگاه استاندارد می‌رسند.', 'wide'],
    ['core', 'مغزه', 'ستون نمونه حفاری با قطعات کانه‌دار.', ''],
    ['conv', 'روش مرسوم', 'یک تفسیر، شبکه ثابت گمانه.', ''],
    ['ours', 'مدل سارینا پارس', 'مدل‌های محتمل و گمانه‌های انتخاب‌شده.', ''],
    ['target', 'مدل پیش‌بین کانه‌زایی', 'ابر احتمال با مدارهای اسکن.', ''],
    ['drill', 'مته حفاری', 'مته مارپیچ با موج ضربه.', ''],
    ['chain', 'زنجیره اکتشاف', 'از پی‌جویی تا عمق‌یابی.', 'wide'],
  ];
  const cells = M.map(([k, t, d, w]) => `<figure class="proto${w ? ' proto--wide' : ''}"><div class="model-wrap">${'<canvas data-model="' + k + '" data-drag="1" class="model" aria-label="' + t + '"></canvas>'}</div><figcaption><b>${t}</b><span>${d}</span><code>${k}</code></figcaption></figure>`).join('');
  const body = `<section class="section section--dark" style="padding-top:140px"><div class="container"><span class="eyebrow">نمونه اولیه</span><h1 style="font-size:clamp(2rem,4vw,3rem)">کتابخانه مدل‌های سه‌بعدی</h1><p class="lead muted">با موس بکشید تا بچرخد. روی هر مدل بروید تا سریع‌تر شود. نام انگلیسی زیر هر مدل را برای انتخاب بگویید.</p>
<h2 style="margin-top:48px;font-size:1.5rem">صحنه اصلی صفحه اول <code class="k">hero</code></h2><p class="muted">همان بلوک زمین با ابر احتمال، مدل‌های محتمل و گمانه‌های در حال حفاری (حلقه ۱۸ ثانیه‌ای).</p>
<div class="visual proto-hero" style="aspect-ratio:16/8;margin-top:16px">${glCanvas(L, 'mini')}</div>
<h2 style="margin-top:56px;font-size:1.5rem">صحنه «چگونه کار می‌کند» <code class="k">how</code></h2><p class="muted">با دکمه‌ها گام را عوض کنید: لایه‌های داده ← مدل‌های محتمل ← گمانه‌های پیشنهادی ← حفاری و به‌روزرسانی.</p>
<div class="stage-btns"><button class="btn btn--ghost" data-st="0">۰۱ داده</button><button class="btn btn--ghost" data-st="1">۰۲ مدل‌ها</button><button class="btn btn--ghost" data-st="2">۰۳ گمانه بعدی</button><button class="btn btn--ghost" data-st="3">۰۴ به‌روزرسانی</button></div>
<div class="visual proto-hero" style="aspect-ratio:16/8;margin-top:16px">${glCanvas(L, 'how')}</div>
<h2 style="margin-top:56px;font-size:1.5rem">مدل‌های کوچک</h2><div class="proto-grid">${cells}</div>
<script>document.addEventListener('click',function(e){var b=e.target.closest('[data-st]');if(b&&window.__how)window.__how.setStage(+b.dataset.st)})</script></div></section>`;
  page(L, { path: '/models/', title: 'نمونه مدل‌های سه‌بعدی', desc: 'نمونه اولیه', body });
}

home(fa);
ai(fa);
protoPage(fa);

writeFileSync(join(OUT, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${SITE}/sitemap.xml\n`);
writeFileSync(join(OUT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${['/', '/ai/'].map((p) => `<url><loc>${SITE}${p}</loc></url>`).join('')}</urlset>`);
console.log('built →', OUT);
