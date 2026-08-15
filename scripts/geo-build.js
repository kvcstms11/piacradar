#!/usr/bin/env node
/**
 * GEO build — regenerates AI/SEO-discoverable artifacts from the source JSON.
 *
 * Inputs (repo root):
 *   - glossary-data.json   (array of { slug, title, sections:[{title,text}] })
 *   - data.json            (array of stories { story_id, title, category, story_text, takeaway, why_now, sent_at })
 *
 * Outputs (repo root):
 *   - szotar/<slug>.html   (ONE INDEXABLE PAGE PER TERM — the SEO engine)
 *   - glossary.html        (JSON-LD DefinedTermSet block refreshed in place)
 *   - stories.html         (JSON-LD Blog block refreshed in place)
 *   - llms-full.txt        (full machine-readable content)
 *   - sitemap.xml          (static pages + every term page)
 *
 * llms.txt is intentionally NOT touched (it is hand-written, content-agnostic).
 *
 * Idempotent: safe to run on every push.
 */
const fs = require('fs');
const path = require('path');

const SITE = 'https://piacradar.eu';
const TG = 'https://t.me/+Mk5bfbCfUf1lMGE0';
const TERM_DIR = 'szotar';

const clean = (t) => (t || '').replace(/\s+/g, ' ').trim();
const shorten = (t, n) => {
  t = clean(t);
  if (t.length <= n) return t;
  return t.slice(0, n).replace(/\s+\S*$/, '') + '…';
};
const readJSON = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const esc = (s) =>
  String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const termUrl = (slug) => `${SITE}/${TERM_DIR}/${slug}.html`;

// ---------- Individual term pages ----------
function termPageHTML(entry, prev, next) {
  const secs = Array.isArray(entry.sections) ? entry.sections : [];
  const first = secs.length && secs[0] && typeof secs[0] === 'object' ? secs[0].text : '';
  const desc = shorten(first, 155);
  const url = termUrl(entry.slug);

  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'DefinedTerm',
        name: entry.title,
        url,
        description: shorten(first, 300),
        inDefinedTermSet: {
          '@type': 'DefinedTermSet',
          name: 'Piacradar Pénzügyi Szótár',
          url: `${SITE}/glossary.html`,
        },
        inLanguage: 'hu',
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Piacradar', item: `${SITE}/` },
          { '@type': 'ListItem', position: 2, name: 'Pénzügyi Szótár', item: `${SITE}/glossary.html` },
          { '@type': 'ListItem', position: 3, name: entry.title, item: url },
        ],
      },
    ],
  };

  const body = secs
    .map((s) => {
      if (!s || typeof s !== 'object') return '';
      const t = clean(s.title);
      const x = clean(s.text);
      if (!x) return '';
      return t
        ? `        <section class="sec">\n          <h2>${esc(t)}</h2>\n          <p>${esc(x)}</p>\n        </section>`
        : `        <section class="sec">\n          <p>${esc(x)}</p>\n        </section>`;
    })
    .filter(Boolean)
    .join('\n');

  const nav = [];
  if (prev) nav.push(`<a class="pn" href="${esc(prev.slug)}.html">← ${esc(shorten(prev.title, 42))}</a>`);
  else nav.push('<span></span>');
  if (next) nav.push(`<a class="pn" href="${esc(next.slug)}.html">${esc(shorten(next.title, 42))} →</a>`);
  else nav.push('<span></span>');

  return `<!doctype html>
<html lang="hu">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(entry.title)} — mit jelent? | Piacradar Pénzügyi Szótár</title>
<meta name="description" content="${esc(desc)}" />
<meta name="robots" content="index,follow,max-snippet:-1,max-image-preview:large" />
<meta name="theme-color" content="#0b1220" />
<link rel="canonical" href="${url}" />
<meta property="og:title" content="${esc(entry.title)} — Piacradar Pénzügyi Szótár" />
<meta property="og:description" content="${esc(desc)}" />
<meta property="og:type" content="article" />
<meta property="og:url" content="${url}" />
<meta property="og:image" content="${SITE}/og.png" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${esc(entry.title)} — Piacradar Pénzügyi Szótár" />
<meta name="twitter:description" content="${esc(desc)}" />
<meta name="twitter:image" content="${SITE}/og.png" />
<link rel="icon" href="/favicon.ico" />
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png" />
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
<style>
:root{--bg:#0b1220;--text:rgba(255,255,255,.92);--muted:rgba(255,255,255,.68);--border:rgba(255,255,255,.14);--accent:#5eead4;--accent2:#60a5fa;--radius:18px}
*{box-sizing:border-box}
body{margin:0;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Inter,Arial;color:var(--text);background:var(--bg);line-height:1.55;overflow-x:hidden}
body::before{content:"";position:fixed;inset:0;z-index:-1;background:radial-gradient(900px 450px at 15% 10%,rgba(94,234,212,.18),transparent 60%),radial-gradient(800px 400px at 85% 20%,rgba(96,165,250,.16),transparent 60%),var(--bg)}
a{color:inherit;text-decoration:none}
.wrap{max-width:760px;margin:0 auto;padding:24px 18px 60px}
.crumbs{font-size:13px;color:var(--muted);margin-bottom:18px}
.crumbs a:hover{color:var(--accent);text-decoration:underline}
h1{font-size:30px;line-height:1.15;letter-spacing:-.4px;margin:0 0 6px}
.kick{display:inline-flex;align-items:center;gap:8px;padding:6px 12px;border:1px solid var(--border);background:rgba(255,255,255,.05);border-radius:999px;font-size:12.5px;color:var(--muted);margin-bottom:16px}
.dot{width:7px;height:7px;border-radius:50%;background:var(--accent)}
.sec{border:1px solid var(--border);background:rgba(255,255,255,.04);border-radius:var(--radius);padding:16px 18px;margin:14px 0}
.sec h2{margin:0 0 8px;font-size:14px;font-weight:900;color:var(--accent);letter-spacing:.2px}
.sec p{margin:0;font-size:15px;color:rgba(255,255,255,.85)}
.pn-row{display:flex;justify-content:space-between;gap:10px;margin-top:26px;flex-wrap:wrap}
.pn{font-size:13px;color:var(--muted);border:1px solid var(--border);background:rgba(255,255,255,.04);padding:9px 12px;border-radius:12px;max-width:48%}
.pn:hover{border-color:rgba(94,234,212,.35);color:var(--text)}
.cta{margin-top:28px;border:1px solid rgba(94,234,212,.3);background:linear-gradient(135deg,rgba(94,234,212,.1),rgba(96,165,250,.07));border-radius:var(--radius);padding:18px}
.cta h3{margin:0 0 6px;font-size:15px}
.cta p{margin:0 0 12px;font-size:13.5px;color:rgba(255,255,255,.78)}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:11px 14px;border-radius:14px;border:1px solid rgba(94,234,212,.35);background:linear-gradient(135deg,rgba(94,234,212,.22),rgba(96,165,250,.14));font-weight:900;font-size:14px}
.btn.ghost{background:rgba(255,255,255,.04);border-color:var(--border)}
footer{margin-top:34px;padding-top:16px;border-top:1px solid rgba(255,255,255,.1);color:rgba(255,255,255,.55);font-size:12px}
footer a:hover{text-decoration:underline}
.legal{margin-top:10px;line-height:1.5}
@media(max-width:520px){h1{font-size:25px}.pn{max-width:100%;width:100%}}
</style>
<script type="application/ld+json">
${JSON.stringify(ld, null, 2)}
</script>
</head>
<body>
<div class="wrap">
  <nav class="crumbs" aria-label="Morzsamenü">
    <a href="/">Piacradar</a> › <a href="/glossary.html">Pénzügyi Szótár</a> › <span>${esc(entry.title)}</span>
  </nav>

  <div class="kick"><span class="dot"></span> Pénzügyi fogalom</div>
  <h1>${esc(entry.title)}</h1>

${body}

  <div class="pn-row">
    ${nav.join('\n    ')}
  </div>

  <div class="cta">
    <h3>Értsd meg, mi mozgatja a piacot</h3>
    <p>Piaci napokon napi 3 elemzés: EU/USA makró, kiemelt vállalati jelentések, Fed és ECB — magyarul, forráslinkkel.</p>
    <a class="btn" href="${TG}" target="_blank" rel="noopener noreferrer">Csatlakozz a zárt közösséghez →</a>
    <a class="btn ghost" href="/glossary.html">Vissza a szótárhoz</a>
  </div>

  <footer>
    <a href="/">Piacradar</a> · <a href="/glossary.html">Szótár</a> · <a href="/stories.html">Történetek</a> · <a href="/adatkezeles.html">Adatkezelés</a>
    <div class="legal">A tartalom kizárólag általános tájékoztatási célt szolgál, nem minősül befektetési tanácsadásnak.</div>
  </footer>
</div>
</body>
</html>
`;
}

function buildTermPages(glossary) {
  if (!fs.existsSync(TERM_DIR)) fs.mkdirSync(TERM_DIR, { recursive: true });

  const sorted = [...glossary].sort((a, b) =>
    a.title.toLowerCase().localeCompare(b.title.toLowerCase(), 'hu')
  );

  const wanted = new Set();
  sorted.forEach((e, i) => {
    if (!e.slug) return;
    const file = path.join(TERM_DIR, `${e.slug}.html`);
    fs.writeFileSync(file, termPageHTML(e, sorted[i - 1] || null, sorted[i + 1] || null));
    wanted.add(`${e.slug}.html`);
  });

  // Remove stale pages for terms that no longer exist
  let removed = 0;
  for (const f of fs.readdirSync(TERM_DIR)) {
    if (f.endsWith('.html') && !wanted.has(f)) {
      fs.unlinkSync(path.join(TERM_DIR, f));
      removed++;
    }
  }
  return { written: wanted.size, removed };
}

// ---------- GLOSSARY JSON-LD (DefinedTermSet) ----------
function glossaryLD(glossary) {
  const terms = glossary.map((e) => {
    const secs = Array.isArray(e.sections) ? e.sections : [];
    const desc = secs.length && secs[0] && typeof secs[0] === 'object' ? secs[0].text : '';
    return {
      '@type': 'DefinedTerm',
      name: e.title,
      url: termUrl(e.slug),
      description: shorten(desc, 180),
      inDefinedTermSet: `${SITE}/glossary.html`,
    };
  });
  return {
    '@context': 'https://schema.org',
    '@type': 'DefinedTermSet',
    name: 'Piacradar Pénzügyi Szótár',
    url: `${SITE}/glossary.html`,
    description: `${glossary.length} pénzügyi és tőzsdei fogalom magyarázata befektetői kontextussal: CPI, GDP, VIX, EPS és sok más.`,
    inLanguage: 'hu',
    hasDefinedTerm: terms,
  };
}

// ---------- STORIES JSON-LD (Blog) ----------
function storiesLD(stories) {
  const posts = stories.map((st) => {
    const post = {
      '@type': 'BlogPosting',
      headline: st.title,
      description: shorten(st.takeaway || st.story_text || '', 200),
      articleSection: st.category || '',
      url: `${SITE}/stories.html#${st.story_id || ''}`,
      inLanguage: 'hu',
      isPartOf: { '@type': 'Blog', name: 'Szombati Történetek', url: `${SITE}/stories.html` },
      publisher: { '@type': 'Organization', name: 'Piacradar', url: `${SITE}/` },
    };
    if (st.sent_at && String(st.sent_at).toLowerCase() !== 'none') {
      post.datePublished = st.sent_at;
    }
    return post;
  });
  return {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: 'Szombati Történetek',
    url: `${SITE}/stories.html`,
    description:
      'Heti történetek piaci összeomlásokról, tőzsdei legendákról és befektetői tanulságokról — magyarul.',
    inLanguage: 'hu',
    blogPost: posts,
  };
}

// ---------- Embed/replace JSON-LD block in an HTML file ----------
function embedLD(p, ld) {
  let html = fs.readFileSync(p, 'utf8');
  const block =
    '<!-- Structured Data (GEO/SEO) — auto-generated by geo-build.js, do not edit by hand -->\n  ' +
    '<script type="application/ld+json">\n' +
    JSON.stringify(ld, null, 2) +
    '\n  </script>';
  const re = /<!-- Structured Data \(GEO\/SEO\)[^>]*-->\s*<script type="application\/ld\+json">[\s\S]*?<\/script>/;
  if (re.test(html)) {
    html = html.replace(re, block);
  } else {
    html = html.replace('</head>', '  ' + block + '\n</head>');
  }
  fs.writeFileSync(p, html);
  JSON.parse(JSON.stringify(ld));
  return html.length;
}

// ---------- sitemap.xml ----------
function buildSitemap(glossary) {
  const today = new Date().toISOString().slice(0, 10);
  const urls = [
    { loc: `${SITE}/`, freq: 'weekly', pri: '1.0' },
    { loc: `${SITE}/glossary.html`, freq: 'weekly', pri: '0.9' },
    { loc: `${SITE}/stories.html`, freq: 'weekly', pri: '0.8' },
    { loc: `${SITE}/adatkezeles.html`, freq: 'yearly', pri: '0.2' },
  ];
  const sorted = [...glossary].sort((a, b) =>
    a.title.toLowerCase().localeCompare(b.title.toLowerCase(), 'hu')
  );
  for (const e of sorted) {
    if (e.slug) urls.push({ loc: termUrl(e.slug), freq: 'monthly', pri: '0.6' });
  }
  const body = urls
    .map(
      (u) =>
        `  <url>\n    <loc>${u.loc}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${u.freq}</changefreq>\n    <priority>${u.pri}</priority>\n  </url>`
    )
    .join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
  fs.writeFileSync('sitemap.xml', xml);
  return urls.length;
}

// ---------- llms-full.txt ----------
function buildLlmsFull(glossary, stories) {
  const out = [];
  out.push('# Piacradar — teljes tartalom (AI/LLM olvasásra)\n');
  out.push(
    `> Ez a fájl a Piacradar teljes edukációs tartalmát tartalmazza gépi olvasásra: a Pénzügyi Szótár összes fogalma és a Szombati Történetek teljes szövege. Forrás és kapcsolat: ${SITE}/ · Telegram: ${TG} · Készítő: Tamás Kovács (https://tamaskovacs.eu).\n`
  );
  out.push(
    'A tartalmak kizárólag általános tájékoztatási célt szolgálnak, nem minősülnek befektetési tanácsadásnak.\n'
  );

  out.push(`\n# Pénzügyi Szótár (${glossary.length} fogalom)\n`);
  out.push(`Forrás: ${SITE}/glossary.html\n`);
  const sorted = [...glossary].sort((a, b) =>
    a.title.toLowerCase().localeCompare(b.title.toLowerCase(), 'hu')
  );
  for (const e of sorted) {
    out.push(`\n## ${e.title}`);
    out.push(`Hivatkozás: ${termUrl(e.slug)}`);
    for (const sec of e.sections || []) {
      if (sec && typeof sec === 'object') {
        const st = clean(sec.title);
        const tx = clean(sec.text);
        if (st && tx) out.push(`\n**${st}** ${tx}`);
        else if (tx) out.push(`\n${tx}`);
      }
    }
  }

  out.push(`\n\n# Szombati Történetek (${stories.length} történet)\n`);
  out.push(`Forrás: ${SITE}/stories.html\n`);
  for (const st of stories) {
    out.push(`\n## ${clean(st.title)}`);
    const meta = [];
    if (st.category) meta.push(`Kategória: ${clean(st.category)}`);
    meta.push(`Hivatkozás: ${SITE}/stories.html#${st.story_id || ''}`);
    out.push(meta.join(' · '));
    if (st.story_text) out.push(`\n${clean(st.story_text)}`);
    if (st.takeaway) out.push(`\n**Tanulság:** ${clean(st.takeaway)}`);
    if (st.why_now) out.push(`\n**Miért aktuális:** ${clean(st.why_now)}`);
  }
  return out.join('\n') + '\n';
}

// ---------- main ----------
function main() {
  const glossary = readJSON('glossary-data.json');
  const stories = readJSON('data.json');

  const pages = buildTermPages(glossary);
  const gLen = embedLD('glossary.html', glossaryLD(glossary));
  const sLen = embedLD('stories.html', storiesLD(stories));

  const full = buildLlmsFull(glossary, stories);
  fs.writeFileSync('llms-full.txt', full);

  const smCount = buildSitemap(glossary);

  console.log(`${TERM_DIR}/: ${pages.written} term pages written, ${pages.removed} stale removed`);
  console.log(`glossary.html: ${glossary.length} terms embedded (${gLen} bytes)`);
  console.log(`stories.html: ${stories.length} posts embedded (${sLen} bytes)`);
  console.log(`llms-full.txt: ${full.length} bytes`);
  console.log(`sitemap.xml: ${smCount} URLs`);
}

main();
