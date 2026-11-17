#!/usr/bin/env node
// one-system 09_focus: plan the server prune from what is actually running, against registry/core-stack.json.
// It never stops or deletes anything itself. It prints the plan and, on request, writes two reviewable scripts:
//   phase 1: stop and disable park/retire items (reversible; a restore script is written next to it)
//   phase 2: remove retire items, refused until 7 days after phase 1 ran on that server
// core, client, migrate and unknown items are never in either script.
//
// Inputs, captured on the server (read-only commands):
//   docker ps -a --format '{{json .}}'                                   > docker.jsonl
//   systemctl list-units --type=service --all --no-legend --plain        > services.txt
// Usage:
//   node scripts/one-system/prune-plan.mjs --server prod-city-1 --docker docker.jsonl --services services.txt [--emit DIR]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const NEVER = new Set(['core', 'client', 'migrate', 'unknown']);

export function loadRules(file = path.join(ROOT, 'registry', 'core-stack.json')) {
  const reg = JSON.parse(fs.readFileSync(file, 'utf8'));
  return reg.rules.map(r => ({ ...r, re: new RegExp(r.match) }));
}

export function parseDocker(text) {
  return String(text || '').split('\n').map(l => l.trim()).filter(Boolean).map(l => {
    const j = JSON.parse(l);
    return { kind: 'container', name: String(j.Names || '').split(',')[0], state: j.State || '', status: j.Status || '' };
  });
}

// "unit.service loaded active running Description" -> { name: 'unit', state: 'active/running' }
export function parseServices(text) {
  return String(text || '').split('\n').map(l => l.trim()).filter(Boolean).map(l => l.replace(/^[●*]\s*/, '').split(/\s+/))
    .filter(p => /\.service$/.test(p[0])).map(p => ({ kind: 'service', name: p[0].replace(/\.service$/, ''), state: p[2] + '/' + p[3] }));
}

export function classify(items, rules, server) {
  return items.map(it => {
    const rule = rules.find(r => (!r.servers || r.servers.includes(server)) && r.re.test(it.name));
    return { ...it, class: rule ? rule.class : 'unknown', system: rule ? rule.system : null };
  });
}

const q = s => "'" + String(s).replace(/'/g, "'\\''") + "'";

export function scripts(plan, server, today = new Date().toISOString().slice(0, 10)) {
  const act = plan.filter(i => !NEVER.has(i.class));
  const guard = (phase) => [
    '#!/usr/bin/env bash',
    `# ${phase} for ${server}, generated ${today} by scripts/one-system/prune-plan.mjs from registry/core-stack.json.`,
    '# Review every line. Nothing here touches core, client, migrate or unknown items.',
    'set -euo pipefail',
    `[ "$(hostname)" = ${q(server)} ] || { echo "wrong server: run this on ${server}"; exit 1; }`,
    `[ "\${CONFIRM:-}" = ${q('PRUNE-' + server)} ] || { echo "set CONFIRM=PRUNE-${server} to run"; exit 1; }`,
  ];
  const marker = `/var/lib/starnet/prune/${server}.phase1`;
  const p1 = guard('Phase 1: stop and disable (reversible)');
  const restore = guard('Restore: undo phase 1');
  for (const i of act) {
    if (i.kind === 'container') {
      p1.push(`docker update --restart=no ${q(i.name)} >/dev/null 2>&1 || true; docker stop ${q(i.name)} >/dev/null 2>&1 || true   # ${i.class}: ${i.system}`);
      restore.push(`docker start ${q(i.name)}`);
    } else {
      p1.push(`systemctl disable --now ${q(i.name + '.service')} || true   # ${i.class}: ${i.system}`);
      restore.push(`systemctl enable --now ${q(i.name + '.service')}`);
    }
  }
  p1.push(`mkdir -p ${q(path.dirname(marker))} && date +%s > ${q(marker)}`, 'echo "phase 1 done; restore script is next to this one"');
  const p2 = guard('Phase 2: remove retired items (not reversible)');
  p2.push(`[ -f ${q(marker)} ] || { echo "phase 1 has not run on this server"; exit 1; }`,
    `[ $(( $(date +%s) - $(cat ${q(marker)}) )) -ge 604800 ] || { echo "wait 7 days after phase 1"; exit 1; }`);
  for (const i of act.filter(x => x.class === 'retire')) {
    if (i.kind === 'container') p2.push(`docker rm ${q(i.name)}   # volumes are kept; remove them separately after a backup check`);
    else p2.push(`echo "service ${i.name}: leave disabled; delete its unit file by hand after checking"`);
  }
  return { phase1: p1.join('\n') + '\n', restore: restore.join('\n') + '\n', phase2: p2.join('\n') + '\n' };
}

export function report(plan, server) {
  const by = c => plan.filter(i => i.class === c);
  const line = i => `- ${i.name} (${i.kind}, ${i.state})${i.system ? ' · ' + i.system : ''}`;
  const out = [`# Prune plan: ${server}`, '', `${plan.length} items: ` + ['core', 'client', 'migrate', 'park', 'retire', 'unknown'].map(c => `${c} ${by(c).length}`).join(', '), ''];
  for (const [c, title] of [['retire', 'Retire: stop now, remove after 7 days'], ['park', 'Park: stop now, keep for later'], ['unknown', 'Unknown: ask Bambu; never touched'], ['migrate', 'Migrate first; never touched by this plan'], ['client', 'Client sites: owner decides each; never touched'], ['core', 'Core: keeps running']]) {
    out.push(`## ${title} (${by(c).length})`, ...by(c).map(line), '');
  }
  return out.join('\n');
}

function main(argv) {
  const arg = k => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : null; };
  const server = arg('--server');
  if (!server || (!arg('--docker') && !arg('--services'))) { console.error('usage: --server NAME --docker FILE --services FILE [--emit DIR]'); process.exit(2); }
  const items = [...(arg('--docker') ? parseDocker(fs.readFileSync(arg('--docker'), 'utf8')) : []), ...(arg('--services') ? parseServices(fs.readFileSync(arg('--services'), 'utf8')) : [])];
  const plan = classify(items, loadRules(), server);
  console.log(report(plan, server));
  const dir = arg('--emit');
  if (dir) {
    const s = scripts(plan, server);
    fs.mkdirSync(dir, { recursive: true });
    for (const [k, v] of Object.entries(s)) fs.writeFileSync(path.join(dir, `${server}-${k}.sh`), v, { mode: 0o700 });
    console.log(`\nScripts written to ${dir}: ${server}-phase1.sh, ${server}-restore.sh, ${server}-phase2.sh. Nothing was run.`);
  }
}
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) main(process.argv.slice(2));
