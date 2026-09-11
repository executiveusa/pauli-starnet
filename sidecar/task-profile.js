/* sidecar/task-profile.js — SLIM RUN PROFILES: least-privilege toolset/wire cuts for narrow headless task
   classes. The first profile is the city's web-research lane (taskClass 'web-research', set by the gateway on
   dish-only research dispatches): the run's GRANTS and WIRE shrink to exactly web_search + web_fetch, so every
   other tool — deferred browser tools, fs/shell/team/routine/channel, all of it — is WITHHELD for the run
   (fail-closed: the capability gate, the deferred-tool reveal, and the name-translation map all see only the
   cut set; a guessed or smuggled call errors as withheld/unknown instead of executing). The cut only ever
   intersects; it can narrow a run, never widen one. Pure and non-mutating. */
'use strict';
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else { root.SK = root.SK || {}; root.SK.taskProfile = api; }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const SLIM_RESEARCH_CLASS = 'web-research';
  const SLIM_RESEARCH_TOOLS = ['web_search', 'web_fetch'];

  // Gated on isTask AND the caller-declared class: an interactive Commander run that happens to carry the
  // string is not a headless task and is never slimmed by accident.
  function isSlimResearchRun(o, isTask) {
    return !!(isTask && o && String(o.taskClass || '') === SLIM_RESEARCH_CLASS);
  }

  function slimResearchToolset(resolved) {
    const keep = new Set(SLIM_RESEARCH_TOOLS);
    const out = Object.assign({}, resolved);
    out.tools = (resolved.tools || []).filter(t => keep.has(t));
    // Nothing deferred survives: with tool.search itself cut, a deferred def would be unreachable anyway —
    // and an unreachable-but-advertisable tool is exactly how a slim wire re-fattens behind the model's back.
    out.deferred = (resolved.deferred || []).filter(t => keep.has(t));
    out.grants = (resolved.grants || []).filter(g => g && keep.has(g.tool));
    const rules = {}, nets = {};
    for (const t of out.tools) {
      if (resolved.approvalRules && resolved.approvalRules[t]) rules[t] = resolved.approvalRules[t];
      if (resolved.networkCaps && Object.prototype.hasOwnProperty.call(resolved.networkCaps, t)) nets[t] = resolved.networkCaps[t];
    }
    out.approvalRules = rules;
    out.networkCaps = nets;
    // hasCompute / room / agentId pass through untouched: the run still thinks, it can only browse.
    return out;
  }

  return { SLIM_RESEARCH_CLASS, SLIM_RESEARCH_TOOLS, isSlimResearchRun, slimResearchToolset };
});
