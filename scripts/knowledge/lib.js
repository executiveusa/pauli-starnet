'use strict';
// Pure helpers for the city knowledge loader (knowledge/CONTEXT.md). No fs, no clock: every function is a
// transform over its inputs so the parser is testable on fixtures and gives the same rows on every machine.
const crypto = require('crypto');

const YT_ID = /(?:v=|youtu\.be\/|^|[^A-Za-z0-9_-])([A-Za-z0-9_-]{11})(?=$|[^A-Za-z0-9_-])/;

function sha256(text) {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
}

// "-sNt3Y2Qjcc.en-orig.vtt" -> "-sNt3Y2Qjcc"; "01-5JAVglJHzG4.md" -> "5JAVglJHzG4"; "0DqFo7vz374.txt" -> same.
function videoIdFromName(name) {
  const base = String(name).replace(/\.(en(-orig)?\.)?(vtt|txt|md|json)$/i, '');
  if (/^[A-Za-z0-9_-]{11}$/.test(base)) return base;
  const m = base.match(/^\d+-([A-Za-z0-9_-]{11})$/);
  return m ? m[1] : null;
}

function stripVtt(raw) {
  const out = [];
  let last = '';
  for (const line of raw.split(/\r?\n/)) {
    if (!line.trim() || /^WEBVTT|^Kind:|^Language:|^NOTE\b|-->/.test(line) || /^\d+$/.test(line.trim())) continue;
    const text = line.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    if (text && text !== last) out.push(text);   // VTT rolling captions repeat each line; keep the first copy
    last = text;
  }
  return out.join(' ');
}

// One transcript file -> { external_id, title, url, creator, text }. Handles the four shapes in the repo:
// plain .txt, "# title / # url" headed .txt, "[00:00:00.080] line" timestamped .txt, Firecrawl .md, and .vtt.
function parseTranscript(name, raw) {
  let title = null, url = null, creator = null, text;
  if (/\.vtt$/i.test(name)) {
    text = stripVtt(raw);
  } else {
    const lines = raw.split(/\r?\n/);
    // Email-copywriter shape: "title" / "https://..." / "Source: ..." header lines with no "#".
    if (lines.length > 2 && !/^#/.test(lines[0]) && /^https?:\/\/\S+$/.test((lines[1] || '').trim())) {
      title = lines[0].trim();
      url = lines[1].trim();
      lines.splice(0, /^Source:/i.test(lines[2] || '') ? 3 : 2);
    }
    const body = [];
    for (const line of lines) {
      const link = line.match(/^#\s*\[(.+?)\]\((https?:\/\/[^)\s\\]+)/);
      const head = line.match(/^#\s+(.*)$/);
      const by = line.match(/^\*\*Uploaded by\*\*:\s*\[([^\]]+)\]/);
      if (link) { title = title || link[1].trim(); url = url || link[2]; continue; }
      if (head && /^https?:\/\//.test(head[1].trim())) { url = url || head[1].trim(); continue; }
      if (head && !title) { title = head[1].trim(); continue; }
      if (by) { creator = by[1].trim(); continue; }
      if (/^<!--|^!\[|^\*\*[A-Za-z ]+\*\*:/.test(line)) continue;
      body.push(line.replace(/^\[\d{2}:\d{2}:\d{2}(\.\d+)?\]\s*/, ''));
    }
    text = body.join(' ').replace(/\s+/g, ' ').trim();
  }
  let external_id = videoIdFromName(name);
  if (!external_id && url) { const m = url.match(YT_ID); external_id = m ? m[1] : null; }
  if (!url && external_id) url = 'https://www.youtube.com/watch?v=' + external_id;
  return { external_id, title, url, creator, text };
}

// Of several files for one video, read the plain transcript and skip caption duplicates.
function pickFiles(names) {
  const byId = new Map();
  const rank = n => (/\.vtt$/i.test(n) ? (/en-orig/.test(n) ? 3 : 2) : 1);
  for (const n of names) {
    if (!/\.(txt|md|vtt)$/i.test(n) || /^(README|CONTEXT)\.md$/i.test(n)) continue;
    const id = videoIdFromName(n) || n;
    const cur = byId.get(id);
    if (!cur || rank(n) < rank(cur)) byId.set(id, n);
  }
  return [...byId.values()].sort();
}

// Paragraph-ish chunks on sentence boundaries, so full-text search returns a quotable passage, not a book.
function chunkText(text, size = 1500) {
  const chunks = [];
  let cur = '';
  for (const s of text.split(/(?<=[.!?])\s+/)) {
    if (cur && cur.length + s.length + 1 > size) { chunks.push(cur); cur = ''; }
    cur = cur ? cur + ' ' + s : s;
    while (cur.length > size * 2) { chunks.push(cur.slice(0, size)); cur = cur.slice(size); }
  }
  if (cur.trim()) chunks.push(cur);
  return chunks;
}

function sqlStr(v) {
  if (v === null || v === undefined) return 'NULL';
  return "'" + String(v).replace(/\u0000/g, '').replace(/'/g, "''") + "'";
}

function sqlJson(v) {
  return sqlStr(JSON.stringify(v)) + '::jsonb';
}

module.exports = { sha256, videoIdFromName, stripVtt, parseTranscript, pickFiles, chunkText, sqlStr, sqlJson };
