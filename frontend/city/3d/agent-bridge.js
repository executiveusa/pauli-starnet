/* agent-bridge.js - binds the 3D mirror to the SAME gateway truth the 2D city uses.
   Polls /.netlify/functions/gw/v1/city/status (the public read-only DTO).
   Honesty rule carried over from the 2D city: an agent moves ONLY on a gateway-evidenced
   state change (task start -> walk to the work point; task end -> walk home). Idle agents
   stand at their home spots - no fabricated strolling in the mirror. */
const GW = "/.netlify/functions/gw";
const POLL_MS = 5000;
const AGENT_COLORS = [0xffd166, 0x6ee7b7, 0x93c5fd, 0xf9a8d4, 0xfca5a5, 0xc4b5fd, 0x5eead4, 0xfde68a];

export function startAgentBridge({ onAgents, onState }) {
  const homes = new Map();     // agentName -> {x, z}
  const applied = new Map();   // agentName -> working bool
  let roster = [];
  let pollCount = 0;

  function homeFor(name, i) {
    if (!homes.has(name)) {
      // Deterministic plaza ring, radius 14-18, one slot per roster index.
      const angle = (i * 2.399963);           // golden angle spread
      const r = 14 + (i % 3) * 2;
      homes.set(name, { x: Math.cos(angle) * r, z: Math.sin(angle) * r });
    }
    return homes.get(name);
  }
  const WORK_POINT = { x: 0, z: 2 };           // world center = the building work point

  async function poll() {
    let status = null;
    try {
      const r = await fetch(GW + "/v1/city/status", { cache: "no-store" });
      if (!r.ok) { onState && onState("gateway " + r.status, "none"); schedule(); return; }
      status = await r.json();
    } catch {
      onState && onState("unreachable", "none"); schedule(); return;
    }
    const citizens = Array.isArray(status.citizens) ? status.citizens : [];
    roster = citizens.filter(c => c && c.name).map(c => String(c.name));
    const working = new Set();
    for (const t of (Array.isArray(status.activeTasks) ? status.activeTasks : [])) {
      if (t && t.state === "running" && t.agent) working.add(String(t.agent));
    }
    const list = roster.map((name, i) => {
      const isWorking = working.has(name);
      const wasWorking = applied.get(name) === true;
      applied.set(name, isWorking);
      const home = homeFor(name, i);
      // Endpoint is evidenced state: working -> work point, idle -> home. The world3d
      // layer lerps between current and target, so a state change reads as WALKING.
      const p = isWorking ? WORK_POINT : home;
      return { id: name, x: p.x, z: p.z, color: AGENT_COLORS[i % AGENT_COLORS.length], working: isWorking, moved: isWorking !== wasWorking };
    });
    onAgents && onAgents(list);
    const moving = list.filter(a => a.moved).length;
    onState && onState("live (poll " + (++pollCount) + ")", moving ? moving + " walking" : (working.size ? working.size + " working" : "idle"));
    schedule();
  }
  let timer = 0;
  function schedule() { clearTimeout(timer); timer = setTimeout(poll, POLL_MS); }
  poll();
  return { stop() { clearTimeout(timer); } };
}
