/* knowledge.test.js — the city knowledge base (knowledge/CONTEXT.md).
   Unit: transcript parsing for every file shape in the repo, the source registry against the CitySpec districts,
   the SQL loader, the knowledge desk (file backend + a stubbed Supabase), and the gateway route behind its bearer.
   DB: when KB_TEST_PGHOST is set (host or socket dir; KB_TEST_PGPORT, default 5432), the migration and loader run
   against a real Postgres and kb_search is queried. Run: node test/knowledge.test.js */
'use strict';
const A = require('./_assert.js');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { spawn, execFileSync } = require('child_process');
const L = require('../scripts/knowledge/lib.js');
const { build } = require('../scripts/knowledge/ingest.js');
const { makeKnowledgeDesk } = require('../gateway/knowledge.js');

const ROOT = path.join(__dirname, '..');
const registry = JSON.parse(fs.readFileSync(path.join(ROOT, 'knowledge', 'sources.json'), 'utf8'));

function req(method, port, p, headers) {
  return new Promise((resolve, reject) => {
    const r = http.request({ host: '127.0.0.1', port, path: p, method, headers: headers || {} }, res => {
      const chunks = []; res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString('utf8') }));
    });
    r.on('error', reject); r.end();
  });
}

(async () => {
  // ---- parsing: every transcript shape in the repo ----
  const vtt = 'WEBVTT\nKind: captions\nLanguage: en\n\n00:00:00.000 --> 00:00:01.630 align:start position:0%\nAll<00:00:00.080><c> right,</c><00:00:00.200><c> here</c>\n\n00:00:01.630 --> 00:00:01.640\nAll right, here\n\n00:00:01.640 --> 00:00:03.000\nwe go.\n';
  A.eq(L.parseTranscript('-sNt3Y2Qjcc.en.vtt', vtt).text, 'All right, here we go.', 'VTT: tags and rolling duplicates are stripped');
  A.eq(L.parseTranscript('-sNt3Y2Qjcc.en.vtt', vtt).external_id, '-sNt3Y2Qjcc', 'VTT: the video id comes from the file name');

  const headed = L.parseTranscript('-j8_YCWZ05Q.txt', '# How to Get Your Customers to Stay\n# https://www.youtube.com/watch?v=-j8_YCWZ05Q\n\nRetention is the game.');
  A.ok(headed.title === 'How to Get Your Customers to Stay' && headed.url.endsWith('-j8_YCWZ05Q') && headed.text === 'Retention is the game.', 'headed .txt: title and url read, body kept');

  const fc = L.parseTranscript('01-5JAVglJHzG4.md', '<!-- source: Firecrawl -->\n\n![Thumb](x.jpg)\n# [I Can\'t Believe It](https://www.youtube.com/watch?v=5JAVglJHzG4)\n\n**Visibility**: Public\n**Uploaded by**: [Monica Main](https://www.youtube.com/@MonicaMain)\n\nCredit starts here.');
  A.ok(fc.external_id === '5JAVglJHzG4' && fc.creator === 'Monica Main' && fc.text === 'Credit starts here.', 'Firecrawl .md: numbered name, creator and body parsed');

  const ts = L.parseTranscript('0DqFo7vz374.txt', '# 0 to $45k\n# https://www.youtube.com/watch?v=0DqFo7vz374\n[00:00:00.080] So, I grew this\n[00:00:01.680] channel fast.');
  A.eq(ts.text, 'So, I grew this channel fast.', 'timestamped .txt: timestamps removed');

  const em = L.parseTranscript('-sNt3Y2Qjcc.txt', 'Copywriting secret #1...\nhttps://www.youtube.com/watch?v=-sNt3Y2Qjcc\nSource: YouTube auto-captions.\n\nHere is a hack.');
  A.ok(em.title === 'Copywriting secret #1...' && em.text === 'Here is a hack.', 'email-copywriter .txt: title/url/source header lines read, not indexed as text');

  A.eq(L.pickFiles(['a1b2c3d4e5f.en-orig.vtt', 'a1b2c3d4e5f.en.vtt', 'a1b2c3d4e5f.txt', 'README.md', 'x.json']), ['a1b2c3d4e5f.txt'], 'one file per video: the plain transcript beats caption files');
  A.eq(L.pickFiles(['a1b2c3d4e5f.en-orig.vtt', 'a1b2c3d4e5f.en.vtt']), ['a1b2c3d4e5f.en.vtt'], 'without a .txt the cleaner caption file is used');

  const long = Array.from({ length: 400 }, (_, i) => 'Sentence number ' + i + ' is here.').join(' ');
  const chunks = L.chunkText(long, 500);
  A.ok(chunks.length > 5 && chunks.every(c => c.length <= 1000) && chunks.join(' ') === long, 'chunks are bounded and lose nothing');
  A.eq(L.sqlStr("it's"), "'it''s'", 'SQL strings are quoted');

  // ---- registry: one home per fact, districts from the CitySpec ----
  const citySrc = fs.readFileSync(path.join(ROOT, 'frontend', 'app', 'cityos.js'), 'utf8');
  const block = citySrc.slice(citySrc.indexOf('districts: ['), citySrc.indexOf(']', citySrc.indexOf("id: 'operations'")));
  const cityDistricts = new Set([...block.matchAll(/\{ id: '([a-z-]+)'/g)].map(m => m[1]));
  A.eq(cityDistricts.size, 12, 'the CitySpec names 12 districts');
  const ids = registry.sources.map(s => s.id);
  A.eq(new Set(ids).size, ids.length, 'source ids are unique');
  for (const s of registry.sources) {
    A.ok(Object.keys(registry.meta.status_values).includes(s.status), s.id + ': status is a known value');
    A.ok(s.routes.length > 0 && s.routes.every(r => cityDistricts.has(r.district) && r.use_for), s.id + ': routes name real CitySpec districts with a use');
    if (s.status === 'indexed') A.ok(fs.existsSync(path.join(ROOT, s.location)), s.id + ': indexed location exists in the repo');
    if (s.graph) A.ok(fs.existsSync(path.join(ROOT, s.graph)), s.id + ': graph file exists');
  }

  // ---- loader ----
  const one = build(registry, { only: 'cause-specialist', dirs: {} });
  A.ok(one.sql.startsWith('BEGIN;') && one.sql.trim().endsWith('COMMIT;'), 'the loader emits one transaction');
  A.eq(one.manifest.sources['cause-specialist'].documents, 40, 'all 40 cause-specialist transcripts load');
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'knowledge', 'MANIFEST.json'), 'utf8'));
  const fresh = build(registry, { dirs: {} }).manifest;
  A.eq(fresh.sources, manifest.sources, 'knowledge/MANIFEST.json matches what the loader reads today (regenerate it with --manifest)');
  const fake = fs.mkdtempSync(path.join(os.tmpdir(), 'kb-server-'));
  fs.writeFileSync(path.join(fake, 'abcdefghij1.txt'), '# Smart site pitch\n# https://www.youtube.com/watch?v=abcdefghij1\n' + 'Form to lead to operator view. '.repeat(20));
  const srv = build(registry, { only: 'jasper-smart-sites', dirs: { 'jasper-smart-sites': fake } });
  A.ok(srv.manifest.sources['jasper-smart-sites'].documents === 1 && /'indexed'/.test(srv.sql), 'an on_server source loads from --dir on the box that has it');
  A.throws(() => build(registry, { only: 'no-such-source', dirs: {} }), 'an unknown --only id is an error');

  // ---- knowledge desk: file backend ----
  const desk = makeKnowledgeDesk({});
  const impact = await desk.search({ q: 'grant donors', district: 'impact', limit: 5 });
  A.ok(impact.code === 200 && impact.body.backend === 'files' && impact.body.results.length > 0, 'impact finds fundraising passages in the repo transcripts');
  A.ok(impact.body.results.every(r => ['cause-specialist', 'monica-main'].includes(r.source_id) && r.snippet && r.external_id), 'and only from sources routed to impact, with citations');
  const prod = await desk.search({ q: 'grant donors', district: 'production', limit: 5 });
  A.eq(prod.body.results.length, 0, 'a district does not see sources that are not routed to it');
  A.eq((await desk.search({ q: '', district: 'impact' })).code, 400, 'an empty query is refused');
  A.eq((await desk.search({ q: 'x', district: 'Bad District!' })).code, 400, 'a malformed district is refused');
  A.eq((await desk.search({ q: 'x', limit: 500 })).code, 400, 'limit is bounded');
  A.ok(desk.sources('impact').body.sources.some(s => s.id === 'cause-specialist'), 'sources lists what a district may use');
  A.eq((await desk.search({ q: 'grant zzqqxx', district: 'impact' })).body.results.length, 0, 'a plain query needs every word');
  A.ok((await desk.search({ q: 'grant or zzqqxx', district: 'impact' })).body.results.length > 0, 'an "or" query matches any word, ranked by how many match');

  // ---- knowledge desk: Supabase backend (stubbed PostgREST) ----
  const calls = [];
  const stubFetch = async (url, init) => { calls.push({ url, init }); return { ok: true, status: 200, text: async () => JSON.stringify([{ source_id: 'cause-specialist', external_id: 'x', title: 't', url: 'u', snippet: 's', rank: 0.3 }]) }; };
  const db = makeKnowledgeDesk({ supabaseUrl: 'https://kb.example/', supabaseKey: 'svc', fetchImpl: stubFetch });
  const dbr = await db.search({ q: 'grants', district: 'impact', limit: 3 });
  A.ok(dbr.body.backend === 'supabase' && dbr.body.results.length === 1, 'with Supabase configured, answers come from kb_search');
  A.ok(calls[0].url === 'https://kb.example/rest/v1/rpc/kb_search' && JSON.parse(calls[0].init.body).p_district === 'impact' && calls[0].init.headers.apikey === 'svc', 'it calls the kb_search RPC with the district and the service key');
  await db.insights({ district: 'revenue', status: 'reviewed' });
  A.ok(/kb_insights\?select=.*district=eq\.revenue&status=eq\.reviewed/.test(calls[1].url), 'insights are filtered by district and status');
  const broken = makeKnowledgeDesk({ supabaseUrl: 'https://kb.example', supabaseKey: 'svc', fetchImpl: async () => ({ ok: false, status: 500, text: async () => 'boom' }) });
  let threw = false; try { await broken.search({ q: 'x' }); } catch (_) { threw = true; }
  A.ok(threw, 'a failing database is an error, never an empty answer that looks like "nothing known"');

  // ---- real Postgres (optional) ----
  if (process.env.KB_TEST_PGHOST) {
    const pg = ['-h', process.env.KB_TEST_PGHOST, '-p', process.env.KB_TEST_PGPORT || '5432', '-U', process.env.KB_TEST_PGUSER || 'postgres', '-v', 'ON_ERROR_STOP=1', '-q'];
    const dbName = 'kbtest_' + process.pid;
    const psql = (args, input) => execFileSync('psql', pg.concat(args), { input, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
    psql(['-d', 'postgres', '-c', 'CREATE DATABASE ' + dbName]);
    try {
      const on = ['-d', dbName];
      psql(on.concat(['-c', "DO $$ BEGIN CREATE ROLE anon; CREATE ROLE authenticated; EXCEPTION WHEN duplicate_object THEN NULL; END $$;"]));
      const mig = path.join(ROOT, 'db', 'migrations', '20261015_0001_knowledge.sql');
      psql(on.concat(['-f', mig])); psql(on.concat(['-f', mig]));
      A.ok(true, 'the migration applies twice with Supabase roles present');
      const sql = build(registry, { only: 'cause-specialist', dirs: {} }).sql;
      psql(on, sql); psql(on, sql);
      A.eq(psql(on.concat(['-Atc', 'select count(*) from kb_documents'])).trim(), '40', 'loading twice leaves 40 documents, not 80');
      const hits = psql(on.concat(['-Atc', "select count(*) from kb_search('grant donors', 'impact', 5)"])).trim();
      A.ok(Number(hits) > 0, 'kb_search finds impact passages in Postgres');
      A.eq(psql(on.concat(['-Atc', "select count(*) from kb_search('grant donors', 'production', 5)"])).trim(), '0', 'kb_search respects district routes');
      let refused = false;
      try { psql(on.concat(['-c', "insert into kb_insights (id, source_id, district, kind, title, body, status, created_by, reviewed_by) values ('x','cause-specialist','impact','rule','t','b','reviewed','agent-a','agent-a')"])); } catch (_) { refused = true; }
      A.ok(refused, 'an insight cannot be marked reviewed by the agent that wrote it');
      A.eq(psql(on.concat(['-Atc', "select has_function_privilege('anon', 'kb_search(text,text,integer)', 'execute')"])).trim(), 'f', 'anonymous callers cannot run kb_search');
    } finally {
      psql(['-d', 'postgres', '-c', 'DROP DATABASE ' + dbName]);
    }
  } else {
    console.log('knowledge.test: KB_TEST_PGHOST not set, Postgres checks skipped');
  }

  // ---- gateway route ----
  const GW = 47000 + Math.floor(Math.random() * 2000), TOKEN = 'tok-' + Math.random().toString(36).slice(2);
  const child = spawn(process.execPath, [path.join(ROOT, 'gateway', 'server.js')], {
    env: Object.assign({}, process.env, { GATEWAY_BEARER_TOKEN: TOKEN, GATEWAY_PORT: String(GW), STARNET_PORT: String(GW + 1), STARNET_MISSION_DIR: fs.mkdtempSync(path.join(os.tmpdir(), 'kb-gw-')), KB_SUPABASE_URL: '', KB_SUPABASE_SERVICE_KEY: '', LOG_LEVEL: 'error' }),
    stdio: 'ignore'
  });
  try {
    const auth = { Authorization: 'Bearer ' + TOKEN };
    let up = false;
    for (let i = 0; i < 40 && !up; i++) { try { await req('GET', GW, '/v1/knowledge/sources', auth); up = true; } catch (_) { await new Promise(r => setTimeout(r, 250)); } }
    A.ok(up, 'gateway started');
    A.eq((await req('GET', GW, '/v1/knowledge/search?q=grant&district=impact')).status, 401, 'knowledge needs the gateway bearer');
    const r = await req('GET', GW, '/v1/knowledge/search?q=grant%20donors&district=impact&limit=3', auth);
    const body = JSON.parse(r.body);
    A.ok(r.status === 200 && body.backend === 'files' && body.results.length > 0, 'GET /v1/knowledge/search answers with cited passages');
    A.eq((await req('GET', GW, '/v1/knowledge/search?q=&district=impact', auth)).status, 400, 'and validates its input');
    A.eq((await req('GET', GW, '/v1/knowledge/nope', auth)).status, 404, 'unknown knowledge paths are 404');
  } finally {
    child.kill();
  }

  A.report('knowledge.test');
})().catch(e => { console.error(e); process.exit(1); });
