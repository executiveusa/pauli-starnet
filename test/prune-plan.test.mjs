// one-system 09_focus: the prune plan keeps the core stack and client sites, stops only park/retire items, and
// never removes anything before phase 1 has run for 7 days. Fixture: Instinct's 2026-11-06 server inventory.
import assert from 'node:assert';
import { loadRules, parseDocker, parseServices, classify, scripts } from '../scripts/one-system/prune-plan.mjs';

let n = 0;
const eq = (a, b, m) => { assert.deepStrictEqual(a, b, m); n++; };
const rules = loadRules();
const dockerOf = (names, state = 'running') => names.map(x => JSON.stringify({ Names: x, State: state, Status: state })).join('\n');

const s1Docker = ['coolify', 'coolify-db', 'coolify-redis', 'coolify-sentinel', 'coolify-proxy', 'supabase-db', 'supabase-kong', 'tila-bridge', 'spatchy-intake', 'jarvis2-web', 'montage-staging-web-1', 'bars', 'kam-preview-app', 'postastudios-app', 'jetty-waves-preview', 'paulis-place-gw', 'trypost-db', 'trypost-redis', 'pi-postgres', 'bars-hermes', 'worker'];
const s1Services = ['hermes-api.service loaded active running x', 'pauli-pi-agent.service loaded active running x', 'starnet-sidecar.service loaded active running x', 'starnet-foreman.service loaded failed failed x', 'pauli-terabithia.service loaded active running x', 'instinct-voice-agent.service loaded active running x', 'ssh.service loaded active running x'].join('\n');
const p1 = classify([...parseDocker(dockerOf(s1Docker)), ...parseServices(s1Services)], rules, 'prod-city-1');
const cls = (plan, name) => plan.find(i => i.name === name).class;

for (const x of ['coolify', 'coolify-proxy', 'supabase-db', 'paulis-place-gw', 'trypost-db', 'bars', 'bars-hermes', 'pi-postgres', 'hermes-api', 'pauli-pi-agent', 'starnet-sidecar', 'pauli-terabithia', 'instinct-voice-agent', 'ssh']) eq(cls(p1, x), 'core', x + ' is core and keeps running');
eq([cls(p1, 'tila-bridge'), cls(p1, 'postastudios-app'), cls(p1, 'spatchy-intake')], ['client', 'client', 'client'], 'client sites are never pruned');
eq([cls(p1, 'montage-staging-web-1'), cls(p1, 'jarvis2-web'), cls(p1, 'jetty-waves-preview'), cls(p1, 'starnet-foreman')], ['retire', 'retire', 'retire', 'retire'], 'broken and superseded items retire');
eq(cls(p1, 'kam-preview-app'), 'park', 'experiments park');
eq(cls(p1, 'worker'), 'unknown', 'an unidentified container is unknown, never guessed');

// The same name is core on headquarters and a migration on the second server.
const p2 = classify(parseDocker(dockerOf(['supabase-db', 'coolify-db', 'genfeed-api', 'macs-agent-portal', 'astra-3d-preview'])), rules, 'srv1099662');
eq([cls(p2, 'supabase-db'), cls(p2, 'coolify-db'), cls(p2, 'genfeed-api'), cls(p2, 'macs-agent-portal'), cls(p2, 'astra-3d-preview')], ['migrate', 'migrate', 'core', 'core', 'retire'], 'srv1099662: duplicates migrate, business apps stay, broken previews retire');

// Scripts touch only park/retire items, are guarded, reversible first, and removal waits 7 days.
const s = scripts(p1, 'prod-city-1', '2026-11-17');
const touched = n => new RegExp(`'${n.replace(/[.]/g, '\\.')}(\\.service)?'`).test(s.phase1);
eq(['coolify', 'supabase-db', 'tila-bridge', 'worker', 'hermes-api', 'ssh'].some(touched), false, 'phase 1 never touches core, client or unknown items');
eq(['montage-staging-web-1', 'kam-preview-app', 'starnet-foreman'].every(touched), true, 'phase 1 stops retire and park items');
eq([/CONFIRM:-.*PRUNE-prod-city-1/.test(s.phase1), /hostname/.test(s.phase1), /docker rm|systemctl stop .*--now.*rm/.test(s.phase1)], [true, true, false], 'phase 1 needs the server and a typed confirmation, and removes nothing');
eq([/604800/.test(s.phase2), /docker rm 'montage-staging-web-1'/.test(s.phase2), /docker rm 'kam-preview-app'/.test(s.phase2)], [true, true, false], 'phase 2 waits 7 days and removes only retired items, never parked ones');
eq(/docker start 'montage-staging-web-1'/.test(s.restore) && /systemctl enable --now 'starnet-foreman.service'/.test(s.restore), true, 'every phase 1 step has a restore line');
console.log('prune-plan.test.mjs: ' + n + ' assertions passed');
