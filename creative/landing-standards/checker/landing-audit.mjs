#!/usr/bin/env node
// landing-audit.mjs - structural floor audit for Max Digital Media landing pages.
// Necessary, not sufficient: visual parity is gated by independent Gauntlet review.
// Usage: node landing-audit.mjs [pages.json]   (zero dependencies, Node 18+)
import { readFileSync, writeFileSync } from 'node:fs';

const pagesPath = process.argv[2] || new URL('./pages.json', import.meta.url).pathname;
const { pages } = JSON.parse(readFileSync(pagesPath, 'utf8'));

const CTA_WORDS = /\b(get started|sign up|try|start|discuss|contact|apply|explore|learn more|book|buy|subscribe|request|join|see how|watch|demo|meet|tell us)\b/i;

async function fetchWithRedirects(url, max = 6) {
  const chain = [];
  let current = url;
  for (let i = 0; i <= max; i++) {
    let res;
    try {
      res = await fetch(current, { redirect: 'manual', signal: AbortSignal.timeout(20000),
        headers: { 'user-agent': 'landing-audit/1.0 (+macs creative district)' } });
    } catch (e) {
      return { error: String(e.message || e), chain };
    }
    chain.push({ url: current, status: res.status });
    if ([301, 302, 303, 307, 308].includes(res.status)) {
      const loc = res.headers.get('location');
      if (!loc) return { error: `redirect with no Location`, chain };
      const next = new URL(loc, current).href;
      if (chain.some(c => c.url === next)) return { error: 'REDIRECT_LOOP', chain, final: next };
      current = next;
      continue;
    }
    const html = res.status === 200 ? await res.text() : null;
    return { status: res.status, chain, html, final: current };
  }
  return { error: 'TOO_MANY_REDIRECTS', chain };
}

function analyze(html) {
  const pick = (re) => { const m = html.match(re); return m ? m[1].trim() : null; };
  const title = pick(/<title[^>]*>([^<]*)<\/title>/i);
  const metaDesc = pick(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i)
    || pick(/<meta[^>]*content=["']([^"']*)["'][^>]*name=["']description["']/i);
  const lang = pick(/<html[^>]*lang=["']([^"']*)["']/i);
  const viewport = /<meta[^>]*name=["']viewport["']/i.test(html);
  const h1s = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)].map(m => m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()).filter(Boolean);
  const hreflangs = [...html.matchAll(/<link[^>]*hreflang=["']([^"']+)["'][^>]*>/gi)].map(m => m[1]);
  const esMx = hreflangs.some(h => /es/i.test(h)) || /["']\/es\b/i.test(html) || /href=["'][^"']*\/es\//i.test(html) || /lang=["']es/i.test(html);
  const imgs = [...html.matchAll(/<img\b[^>]*>/gi)];
  const imgsNoAlt = imgs.filter(t => !/\balt=["'][^"']*["']/i.test(t)).length;
  // CTAs: anchors + buttons, first 12 candidates
  const ctas = [...html.matchAll(/<a\b[^>]*>([\s\S]*?)<\/a>|<button\b[^>]*>([\s\S]*?)<\/button>/gi)]
    .map(m => (m[1] || m[2] || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())
    .filter(t => t && t.length < 60);
  const ctaHits = ctas.filter(t => CTA_WORDS.test(t));
  return { title, metaDesc, lang, viewport, h1s, hreflangs, esMx,
    imgCount: imgs.length, imgsNoAlt, ctaHits: [...new Set(ctaHits)].slice(0, 6),
    bytes: Buffer.byteLength(html) };
}

function score(page, r) {
  // checks: [id, label, pass, critical?]
  if (r.error) return { verdict: 'HOLD', checks: [['reachable', 'page reachable', false, true]], detail: r.error, chain: r.chain };
  if (r.status !== 200) return { verdict: 'HOLD', checks: [['reachable', `HTTP ${r.status}`, false, true]], detail: `final status ${r.status}`, chain: r.chain };
  const a = r.analysis;
  const altPct = a.imgCount ? Math.round(100 * (a.imgCount - a.imgsNoAlt) / a.imgCount) : 100;
  const checks = [
    ['reachable', 'HTTP 200, no redirect loop', true, true],
    ['title', `title: "${(a.title || 'MISSING').slice(0, 60)}"`, !!a.title, true],
    ['meta-desc', 'meta description present', !!a.metaDesc, false],
    ['lang', `html lang="${a.lang || 'MISSING'}"`, !!a.lang, true],
    ['es-mx', 'es-MX version linked/detectable', a.esMx, false],
    ['h1', a.h1s.length === 1 ? `one h1: "${a.h1s[0].slice(0, 60)}"` : `${a.h1s.length} h1 elements`, a.h1s.length >= 1, true],
    ['cta', a.ctaHits.length ? `CTA found: ${a.ctaHits.slice(0, 3).join(' / ')}` : 'no CTA-like link/button detected', a.ctaHits.length >= 1, true],
    ['viewport', 'viewport meta present', a.viewport, true],
    ['alt', `image alt coverage ${altPct}% (${a.imgCount - a.imgsNoAlt}/${a.imgCount})`, altPct >= 90, false],
    ['weight', `HTML ${(a.bytes / 1024).toFixed(0)} KB`, a.bytes < 1024 * 1024, false],
  ];
  const criticalFail = checks.some(c => c[3] && !c[2]);
  return { verdict: criticalFail ? 'HOLD' : 'STRUCTURAL-PASS', checks, detail: null, chain: r.chain };
}

const results = [];
for (const p of pages) {
  if (!p.url) { results.push({ page: p, skipped: p.note || 'no URL' }); continue; }
  const r = await fetchWithRedirects(p.url);
  if (r.html) r.analysis = analyze(r.html);
  const s = score(p, r);
  results.push({ page: p, ...s });
}

// report
const now = new Date().toISOString().slice(0, 10);
let md = `# Landing audit - ${now}\n\nStructural floor per LANDING-STANDARDS.md. Bars audited for information only.\n\n`;
md += `| Page | Role | Verdict | Notes |\n| --- | --- | --- | --- |\n`;
for (const r of results) {
  if (r.skipped) { md += `| ${r.page.name} | ${r.page.role} | N/A | ${r.skipped} |\n`; continue; }
  const fails = r.checks.filter(c => !c[2]).map(c => c[0]).join(', ') || 'none';
  md += `| [${r.page.name}](${r.page.url}) | ${r.page.role} | ${r.verdict} | fails: ${fails} |\n`;
}
md += `\n`;
for (const r of results) {
  if (r.skipped) { md += `## ${r.page.name}\n\nSKIPPED: ${r.skipped}\n\n`; continue; }
  md += `## ${r.page.name} - ${r.verdict}\n\n${r.page.url}\n`;
  if (r.chain && r.chain.length > 1) md += `Redirect chain: ${r.chain.map(c => `${c.status} ${c.url}`).join(' -> ')}\n`;
  if (r.detail) md += `Detail: ${r.detail}\n`;
  md += `\n| Check | Result | Critical |\n| --- | --- | --- |\n`;
  for (const [, label, pass, crit] of r.checks) md += `| ${label} | ${pass ? 'PASS' : 'FAIL'} | ${crit ? 'yes' : 'no'} |\n`;
  md += `\n`;
}
console.log(md);
writeFileSync(new URL('./last-audit.md', import.meta.url), md);
