'use strict';
// STARFACTORY-001: the minimum-slice workflow as a pure function of Paperclip state.
//   implement -> review (independent QA) -> [repair -> review]* -> owner acceptance
// Heisenberg calls planNext() with what Paperclip says right now and does exactly what it returns.
// Nothing here remembers anything: restart-safe by construction, and idempotent because the caller
// re-reads Paperclip before creating the next child.

const TITLE_RE = /^\[sf:([A-Za-z0-9_.-]{1,100}):(spec|implement|review|repair):(\d{1,3})\]/;
const MISSION_RE = /^\[sf:([A-Za-z0-9_.-]{1,100})\]/;
const BUILD_STAGES = new Set(['implement', 'repair']);

function missionTitle(mid, intent) { return '[sf:' + mid + '] ' + String(intent).replace(/\s+/g, ' ').slice(0, 100); }
function stageTitle(mid, stage, seq, label) { return '[sf:' + mid + ':' + stage + ':' + seq + '] ' + label; }
function parseMissionTitle(t) { const m = MISSION_RE.exec(String(t || '')); return m ? m[1] : null; }
function parseStageTitle(t) { const m = TITLE_RE.exec(String(t || '')); return m ? { mission: m[1], stage: m[2], seq: Number(m[3]) } : null; }

// children: [{ id, title, status, assigneeAgentId }]   verdicts: { [reviewIssueId]: { verdict, authorAgentId } }
// one-system 06: software missions (spec.pipeline === 'software') start with a written spec; the build starts when the
// spec stage is done. Everything after that is unchanged.
function planNext({ children, verdicts, qaAgentId, maxRepairs = 2, firstStage = 'implement' }) {
  const parsed = (children || [])
    .map(c => Object.assign({}, c, parseStageTitle(c.title)))
    .filter(c => c.stage)
    .sort((a, b) => a.seq - b.seq);
  if (!parsed.length) return { type: 'create', stage: firstStage === 'spec' ? 'spec' : 'implement', seq: 1, role: 'pi' };

  const last = parsed[parsed.length - 1];
  if (last.status === 'cancelled') return { type: 'escalate', reason: last.stage + ' #' + last.seq + ' was cancelled' };
  if (last.stage === 'spec') {
    if (last.status !== 'done') return { type: 'wait', on: last.id, stage: 'spec' };
    return { type: 'create', stage: 'implement', seq: last.seq + 1, role: 'pi' };
  }

  if (BUILD_STAGES.has(last.stage)) {
    if (last.status !== 'done') return { type: 'wait', on: last.id, stage: last.stage };
    return { type: 'create', stage: 'review', seq: last.seq + 1, role: 'qa', builderAgentId: last.assigneeAgentId || null };
  }

  // last.stage === 'review'
  if (last.status !== 'done') return { type: 'wait', on: last.id, stage: 'review' };
  const v = verdicts && verdicts[last.id];
  const builder = [...parsed].reverse().find(c => BUILD_STAGES.has(c.stage));
  if (!v || (v.verdict !== 'PASS' && v.verdict !== 'FAIL')) {
    return { type: 'escalate', reason: 'review #' + last.seq + ' closed without a recorded verdict' };
  }
  // Separation of duties: a verdict only counts if the QA agent wrote it, and the QA agent is not the builder.
  if (!qaAgentId || v.authorAgentId !== qaAgentId) {
    return { type: 'escalate', reason: 'review #' + last.seq + ' verdict was not authored by the QA agent' };
  }
  if (builder && builder.assigneeAgentId && builder.assigneeAgentId === qaAgentId) {
    return { type: 'escalate', reason: 'builder and reviewer are the same agent; independent review is impossible' };
  }
  if (v.verdict === 'PASS') return { type: 'await_acceptance', reviewId: last.id };
  const repairs = parsed.filter(c => c.stage === 'repair').length;
  if (repairs >= maxRepairs) return { type: 'escalate', reason: 'review failed after ' + repairs + ' repair attempt(s); retry budget exhausted' };
  return { type: 'create', stage: 'repair', seq: last.seq + 1, role: 'pi', findings: v.findings || [] };
}

module.exports = { planNext, missionTitle, stageTitle, parseMissionTitle, parseStageTitle };
