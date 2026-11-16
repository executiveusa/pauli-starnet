'use strict';
// one-system 06_pipelines: multi-stage work as a chain of missions. The run's position is derived from Paperclip
// (mission ids "<district>.<pipeline>.<run>.<NN>-<stage>"), so nothing is remembered locally.
const RUN_RE = /^[a-z0-9-]{1,40}$/;

function stageMissionId(pipelineId, def, run, i) {
  const st = def.stages[i];
  return (st.district + '.' + pipelineId + '.' + run + '.' + String(i + 1).padStart(2, '0') + '-' + st.name).slice(0, 100);
}

// missions: [{ mission_id, status }] from Paperclip. ownerAdvanced: Set of stage indexes the owner released.
function nextStep(pipelineId, def, run, missions, ownerAdvanced = new Set()) {
  if (!RUN_RE.test(run)) return { action: 'invalid', reason: 'run id must be lowercase letters, digits and dashes' };
  const byId = new Map((missions || []).map(m => [m.mission_id, m]));
  for (let i = 0; i < def.stages.length; i++) {
    const mid = stageMissionId(pipelineId, def, run, i);
    const m = byId.get(mid);
    if (!m) return { action: 'submit', index: i, mission_id: mid, stage: def.stages[i] };
    if (m.status === 'cancelled') return { action: 'stopped', index: i, reason: 'stage ' + def.stages[i].name + ' was cancelled' };
    if (m.status !== 'done') return { action: 'wait', index: i, mission_id: mid, status: m.status };
    if (def.stages[i].gate === 'owner' && !ownerAdvanced.has(i) && i < def.stages.length - 1) {
      return { action: 'owner_gate', index: i, mission_id: mid, reason: 'waiting for the owner to advance past ' + def.stages[i].name };
    }
  }
  return { action: 'done' };
}

module.exports = { nextStep, stageMissionId, RUN_RE };
