/* sidecar/capability/registry.js — CAP_REGISTRY: objectType -> grant[].
   THE static map that makes "room objects = capability grants" real. The builder UI edits
   rows here (data), never code. A grant is a policy triple, not a boolean.

   grant = { capId, tool, scope:'read'|'write'|'execute', requiresConsent, network, paramConstraints? }

   'computer' grants the special capId 'compute' — the precondition to spend a model turn at all
   (the COMPUTE GATE), not a tool the model invokes. Other objects grant callable tools. */
'use strict';
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else { root.SK = root.SK || {}; (root.SK.capability = root.SK.capability || {}).registry = api; }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const CAP_REGISTRY = {
    computer: [
      { capId: 'compute', tool: 'model.chat', scope: 'execute', requiresConsent: false, network: true },
      // QUEST V2 §B: quest.update rides the `computer` object — the ONE object in BOTH the interactive baseline
      // (compute-only) office AND fullOffice, so EVERY task surface gets it (the interactive surface has no placed
      // notebook, which is why granting this under `notebook` left the tool ABSENT while the STATION QUESTS prompt
      // commanded its use — a truthful-telemetry break). A quest is the agent's OWN standing objective: knowing and
      // updating it is part of being able to think at all — the same freebie class as compute — with no outward
      // mutation until the Commander confirms an attest. capId is 'quest', NOT 'compute': resolve.js treats a
      // 'compute' grant as the COMPUTE GATE (sets hasCompute and `continue`s — never a callable tool), so 'compute'
      // would make quest.update permanently absent. A distinct 'quest' capId surfaces as a real tool and stays honest
      // in every consumer — it has no TOOLSETS_META row (toolsets.js) so it is never a toggleable family (correct: a
      // freebie, like compute), it is not in capsummary's CAPS list so it is never advertised/nagged, and capdrift
      // keys on objectTypes (unchanged) so the prop⇄cap seam is intact. (see tools/builtin/quests.js)
      { capId: 'quest', tool: 'quest.update', scope: 'write', requiresConsent: false, network: false },
      // DELIVERABLE NOTE: the agent's own plain-English name for the files it just made. Rides `computer` for
      // exactly the reason quest.update does — it is the ONE object in both the compute-only interactive office
      // and fullOffice, so the runs MOST in need of a readable name (a plain chat that wrote one file, with no
      // cabinet on the floor) are not the ones that can never supply one. capId is 'deliverable', NOT 'compute':
      // resolve.js treats a 'compute' grant as the COMPUTE GATE and never emits it as a callable tool, which is
      // the trap quest.update documents directly above. It writes no file, reaches no network and has no outward
      // effect — it only labels work the run already did — so it is the same freebie class as compute and quest,
      // with no TOOLSETS_META row (never a toggleable family) and no capsummary CAPS row (never advertised or
      // nagged). It can NEVER assert status, crew or byte counts: the tool takes a four-key allowlist and drops
      // everything else, because those facts are the harness's to derive. (see tools/builtin/deliverable.js)
      { capId: 'deliverable', tool: 'deliverable_note', scope: 'write', requiresConsent: false, network: false },
      // TOOL SEARCH: how the agent reaches a DEFERRED tool. Rides `computer` for the same reason quest.update
      // does — it is the ONE object in both the compute-only interactive office and fullOffice, so a deferred
      // tool is never stranded on a surface that cannot look it up. capId is 'toolsearch', NOT 'compute'
      // (resolve.js treats a 'compute' grant as the COMPUTE GATE and never emits it as a callable tool, which
      // would make this permanently absent — the exact trap quest.update hit). No TOOLSETS_META row, so it is
      // not a toggleable family: switching it off would strand every deferred tool behind a tool that no
      // longer exists. It is never itself deferred — the finder cannot be the thing that must be found.
      { capId: 'toolsearch', tool: 'tool.search', scope: 'read', requiresConsent: false, network: false },
      { capId: 'code', tool: 'code.run', scope: 'read', requiresConsent: false, network: false },
      // HARNESS SELF-KNOWLEDGE: reading the station's own secret-free status is part of being able to
      // operate at all, not a power the Commander should have to unlock with a DISH, CABINET or WORKBENCH.
      // A distinct capId is required because `compute` is the non-callable model gate in resolve.js.
      { capId: 'stationinfo', tool: 'station.inspect', scope: 'read', requiresConsent: false, network: false },
      // Host-scoped scheduled scratchpad: the computer is present on every runnable station, while the tool
      // itself refuses any run without a host-minted cronJobId. This does not grant general notebook access.
      { capId: 'routinescratch', tool: 'routine.notepad', scope: 'write', requiresConsent: false, network: false },
      // TASK PLAN: the agent's in-session todo list — MOVED here from `notebook` (memory) 2026-08-17. Tracking
      // your own multi-step plan is part of being able to think at all, the same freebie class as quest.update
      // directly above and for the same mechanical reason: `computer` is the ONE object in BOTH the
      // compute-only interactive office and fullOffice, so a station without a placed NOTEBOOK no longer
      // silently has NO task-list mechanism (and loop.js's post-compaction todo re-injection was dead on
      // exactly those stations). capId is 'taskplan', NOT 'compute' (resolve.js treats a 'compute' grant as
      // the COMPUTE GATE and never emits it as a callable tool — the trap quest.update documents). No
      // TOOLSETS_META row (never a toggleable family), no capsummary CAPS row (never advertised or nagged).
      // The plan itself still persists through the notebook STORE — this grant is about tool AVAILABILITY,
      // not where the bytes live. (see tools/builtin/todo.js)
      { capId: 'taskplan', tool: 'todo', scope: 'write', requiresConsent: false, network: false }
    ],
    notebook: [
      { capId: 'memory', tool: 'notebook.write', scope: 'write', requiresConsent: false, network: false },
      { capId: 'memory', tool: 'notebook.read', scope: 'read', requiresConsent: false, network: false },
      { capId: 'memory', tool: 'notebook.feedback', scope: 'write', requiresConsent: false, network: false },
      { capId: 'memory', tool: 'recall_conversation', scope: 'read', requiresConsent: false, network: false },
      { capId: 'memory', tool: 'skill.write', scope: 'write', requiresConsent: false, network: false },
      { capId: 'memory', tool: 'skill.manage', scope: 'write', requiresConsent: false, network: false },
      { capId: 'memory', tool: 'skill.list', scope: 'read', requiresConsent: false, network: false },
      { capId: 'memory', tool: 'skill.view', scope: 'read', requiresConsent: false, network: false },
      { capId: 'memory', tool: 'widget.set', scope: 'write', requiresConsent: false, network: false }
    ],
    cabinet: [
      { capId: 'cabinet', tool: 'fs.read', scope: 'read', requiresConsent: false, network: false },
      { capId: 'cabinet', tool: 'fs.list', scope: 'read', requiresConsent: false, network: false },
      { capId: 'cabinet', tool: 'fs.search', scope: 'read', requiresConsent: false, network: false },
      { capId: 'cabinet', tool: 'fs.write', scope: 'write', requiresConsent: true, network: false },
      { capId: 'cabinet', tool: 'fs.append', scope: 'write', requiresConsent: true, network: false },
      { capId: 'cabinet', tool: 'fs.edit', scope: 'write', requiresConsent: true, network: false },
      { capId: 'cabinet', tool: 'fs.patch', scope: 'write', requiresConsent: true, network: false }
    ],
    dish: [
      { capId: 'web', tool: 'web_search', scope: 'read', requiresConsent: false, network: true },
      { capId: 'web', tool: 'web_fetch', scope: 'read', requiresConsent: false, network: true },
      { capId: 'web', tool: 'web_request', scope: 'execute', requiresConsent: true, network: true },
      { capId: 'web', tool: 'connectors.list', scope: 'read', requiresConsent: false, network: false },
      { capId: 'web', tool: 'browser.navigate', scope: 'read', requiresConsent: false, network: true },
      { capId: 'web', tool: 'browser.snapshot', scope: 'read', requiresConsent: false, network: true },
      { capId: 'web', tool: 'browser.get_text', scope: 'read', requiresConsent: false, network: true },
      { capId: 'web', tool: 'browser.wait', scope: 'read', requiresConsent: false, network: true },
      { capId: 'web', tool: 'browser.find', scope: 'read', requiresConsent: false, network: true },
      { capId: 'web', tool: 'browser.attach', scope: 'execute', requiresConsent: true, network: true, deferred: true },
      { capId: 'web', tool: 'browser.detach', scope: 'execute', requiresConsent: false, network: true, deferred: true },
      { capId: 'web', tool: 'browser.pdf', scope: 'read', requiresConsent: false, network: true, deferred: true },
      { capId: 'web', tool: 'browser.intercept', scope: 'execute', requiresConsent: false, network: true, deferred: true },
      { capId: 'web', tool: 'browser.emulate', scope: 'execute', requiresConsent: false, network: true, deferred: true },
      { capId: 'web', tool: 'browser.console', scope: 'read', requiresConsent: false, network: true, deferred: true },
      { capId: 'web', tool: 'browser.vision', scope: 'read', requiresConsent: false, network: true },
      { capId: 'web', tool: 'browser.login', scope: 'execute', requiresConsent: false, network: true, deferred: true },
      { capId: 'web', tool: 'browser.click', scope: 'execute', requiresConsent: true, network: true },
      { capId: 'web', tool: 'browser.type', scope: 'execute', requiresConsent: true, network: true },
      { capId: 'web', tool: 'browser.press', scope: 'execute', requiresConsent: true, network: true },
      { capId: 'web', tool: 'browser.dialog', scope: 'execute', requiresConsent: true, network: true, deferred: true },
      { capId: 'web', tool: 'browser.scroll', scope: 'execute', requiresConsent: false, network: true, deferred: true },
      { capId: 'web', tool: 'browser.back', scope: 'execute', requiresConsent: false, network: true },
      { capId: 'web', tool: 'browser.forward', scope: 'execute', requiresConsent: false, network: true, deferred: true },
      { capId: 'web', tool: 'browser.hover', scope: 'execute', requiresConsent: false, network: true, deferred: true },
      { capId: 'web', tool: 'browser.viewport', scope: 'execute', requiresConsent: false, network: true, deferred: true },
      { capId: 'web', tool: 'browser.screenshot', scope: 'read', requiresConsent: false, network: true },
      { capId: 'web', tool: 'browser.network', scope: 'read', requiresConsent: false, network: true, deferred: true },
      { capId: 'web', tool: 'browser.inspect', scope: 'read', requiresConsent: false, network: true, deferred: true },
      { capId: 'web', tool: 'browser.eval', scope: 'execute', requiresConsent: true, network: true, deferred: true },
      { capId: 'web', tool: 'browser.tabs', scope: 'read', requiresConsent: false, network: true, deferred: true },
      { capId: 'web', tool: 'browser.tab_select', scope: 'execute', requiresConsent: false, network: true, deferred: true },
      { capId: 'web', tool: 'browser.select', scope: 'execute', requiresConsent: true, network: true, deferred: true },
      { capId: 'web', tool: 'browser.drag', scope: 'execute', requiresConsent: true, network: true, deferred: true },
      { capId: 'web', tool: 'browser.upload', scope: 'execute', requiresConsent: true, network: true, deferred: true },
      { capId: 'web', tool: 'browser.tab_close', scope: 'execute', requiresConsent: true, network: true, deferred: true },
      { capId: 'comms', tool: 'channel.targets', scope: 'read', requiresConsent: false, network: false },
      { capId: 'comms', tool: 'channel.send', scope: 'execute', requiresConsent: true, network: true }
    ],
    connector: [],
    workbench: [
      { capId: 'workbench', tool: 'shell.exec', scope: 'execute', requiresConsent: true, network: true },
      { capId: 'workbench', tool: 'verify.run', scope: 'execute', requiresConsent: true, network: true },
      { capId: 'workbench', tool: 'browser.test_navigate', scope: 'read', requiresConsent: false, network: true, deferred: true },
      { capId: 'workbench', tool: 'browser.test_snapshot', scope: 'read', requiresConsent: false, network: false, deferred: true },
      { capId: 'workbench', tool: 'browser.test_input', scope: 'execute', requiresConsent: false, network: false, deferred: true },
      { capId: 'workbench', tool: 'browser.test_state', scope: 'read', requiresConsent: false, network: false, deferred: true },
      { capId: 'workbench', tool: 'shell.bg.status', scope: 'read', requiresConsent: false, network: false },
      { capId: 'workbench', tool: 'shell.bg.read', scope: 'read', requiresConsent: false, network: false },
      { capId: 'workbench', tool: 'shell.bg.write', scope: 'execute', requiresConsent: true, network: true },
      { capId: 'workbench', tool: 'shell.bg.kill', scope: 'write', requiresConsent: false, network: false },
      { capId: 'workbench', tool: 'terminal.start', scope: 'execute', requiresConsent: true, network: true },
      { capId: 'workbench', tool: 'terminal.status', scope: 'read', requiresConsent: false, network: false },
      { capId: 'workbench', tool: 'terminal.read', scope: 'read', requiresConsent: false, network: false },
      { capId: 'workbench', tool: 'terminal.write', scope: 'execute', requiresConsent: true, network: true },
      { capId: 'workbench', tool: 'terminal.resize', scope: 'write', requiresConsent: false, network: false },
      { capId: 'workbench', tool: 'terminal.interrupt', scope: 'write', requiresConsent: false, network: false },
      { capId: 'workbench', tool: 'terminal.stop', scope: 'write', requiresConsent: false, network: false }
    ],
    orchestrator: [
      { capId: 'orchestrator', tool: 'team.dispatch', scope: 'execute', requiresConsent: true, network: true },
      { capId: 'orchestrator', tool: 'team.spawn', scope: 'execute', requiresConsent: true, network: true },
      { capId: 'orchestrator', tool: 'team.summon', scope: 'write', requiresConsent: true, network: false },
      { capId: 'orchestrator', tool: 'team.subagents', scope: 'read', requiresConsent: false, network: false },
      { capId: 'orchestrator', tool: 'team.steer', scope: 'write', requiresConsent: false, network: false },
      { capId: 'orchestrator', tool: 'team.interrupt', scope: 'write', requiresConsent: false, network: false },
      { capId: 'orchestrator', tool: 'team.resume', scope: 'execute', requiresConsent: false, network: true },
      { capId: 'orchestrator', tool: 'routine.list', scope: 'read', requiresConsent: false, network: false },
      { capId: 'orchestrator', tool: 'routine.create', scope: 'write', requiresConsent: true, network: false },
      { capId: 'orchestrator', tool: 'routine.manage', scope: 'write', requiresConsent: true, network: false },
      { capId: 'orchestrator', tool: 'session.list', scope: 'read', requiresConsent: false, network: false },
      { capId: 'orchestrator', tool: 'session.create', scope: 'write', requiresConsent: false, network: false },
      { capId: 'orchestrator', tool: 'session.peek', scope: 'read', requiresConsent: false, network: false },
      { capId: 'orchestrator', tool: 'session.focus', scope: 'write', requiresConsent: false, network: false },
      { capId: 'orchestrator', tool: 'task.list', scope: 'read', requiresConsent: false, network: false },
      { capId: 'orchestrator', tool: 'task.create', scope: 'write', requiresConsent: false, network: false },
      { capId: 'orchestrator', tool: 'task.manage', scope: 'write', requiresConsent: true, network: false },
      // PAULI'S PLACE CITY OS: high-level structural compiler. PLAN is read-only/detached; APPLY changes
      // capability placement + workflow topology and UNDO removes it, so both live mutations stay behind
      // the native consent gate. The model never receives room/prop/tile primitives directly.
      { capId: 'orchestrator', tool: 'city.inspect', scope: 'read', requiresConsent: false, network: false },
      { capId: 'orchestrator', tool: 'city.plan', scope: 'read', requiresConsent: false, network: false },
      { capId: 'orchestrator', tool: 'city.apply', scope: 'write', requiresConsent: true, network: false },
      { capId: 'orchestrator', tool: 'city.undo', scope: 'write', requiresConsent: true, network: false },
      { capId: 'orchestrator', tool: 'loop.list', scope: 'read', requiresConsent: false, network: false },
      { capId: 'orchestrator', tool: 'loop.create', scope: 'write', requiresConsent: true, network: false },
      { capId: 'orchestrator', tool: 'loop.manage', scope: 'write', requiresConsent: true, network: false }
    ],
    studio: [
      { capId: 'studio', tool: 'image_generate', scope: 'write', requiresConsent: true, network: true },
      { capId: 'studio', tool: 'image_analyze', scope: 'read', requiresConsent: false, network: true },
      { capId: 'studio', tool: 'voice_generate', scope: 'write', requiresConsent: true, network: true }
    ],
    jukebox: [
      { capId: 'jukebox', tool: 'spotify_search', scope: 'read', requiresConsent: false, network: true },
      { capId: 'jukebox', tool: 'spotify_now_playing', scope: 'read', requiresConsent: false, network: true },
      { capId: 'jukebox', tool: 'spotify_playlists', scope: 'read', requiresConsent: false, network: true },
      { capId: 'jukebox', tool: 'spotify_play', scope: 'execute', requiresConsent: true, network: true },
      { capId: 'jukebox', tool: 'spotify_pause', scope: 'execute', requiresConsent: true, network: true },
      { capId: 'jukebox', tool: 'spotify_next', scope: 'execute', requiresConsent: true, network: true },
      { capId: 'jukebox', tool: 'spotify_previous', scope: 'execute', requiresConsent: true, network: true },
      { capId: 'jukebox', tool: 'spotify_queue', scope: 'execute', requiresConsent: true, network: true }
    ]
  };

  function deepFreeze(o) {
    Object.freeze(o);
    for (const k in o) { const v = o[k]; if (v && typeof v === 'object' && !Object.isFrozen(v)) deepFreeze(v); }
    return o;
  }
  deepFreeze(CAP_REGISTRY);

  return { CAP_REGISTRY };
});
