/* sidecar/pauli-council-runner.js — live model wiring for Pauli's council (chunk 5).

   Wires the chunk-3 council protocol (sidecar/pauli-council.js) to real workers. The council
   module owns the rules; this runner owns the execution. The ASTRA GATE is execution config
   (districts/pauli/CONTEXT.md standing rule), hard-wired here:

   DENY-BY-DEFAULT: run() refuses to call ANY model without a mission-bound owner grant
   { missionId, provider, model, expiresAt, budgetUSD }. No grant, no tokens.

   ESTIMATE FIRST: estimate() prices the whole debate BEFORE anything runs - per-turn input
   tokens, expected output tokens, tool-loop headroom, and the math is exposed in the estimate
   object, because the owner approves THE ESTIMATE, not a blank check. If the estimate exceeds
   the grant budget, run() refuses before a single model call.

   ASTRA LANE: when the judge (or any role) is an Astra model (default id 'gpt-6-astra'), the
   grant's model field must cover the Astra lane - a grant for a cheap model does not unlock
   Pauli's judge. Free-first routing everywhere else: the runner takes whatever model ids the
   mission declares and prices them from an injected price table (unknown model = refused,
   never silently free).

   RECEIPTS: every finished or escalated run appends an execution receipt (missionId, grant,
   estimate, actual usage as reported by the workers, ruling/escalation) to
   pauli-council/executions.jsonl - the mission-ledger record the standing rule requires.

   All ambient I/O is INJECTED: callModel (the worker binding - production wires it to the
   repo's execution router; tests stub it), tokenizer, prices, fs/pathMod/clock/idgen/crypto.
   No model SDK here, no network, no Date.now/Math.random. Storage fails open.

   makePauliCouncilRunner({ council, callModel, prices, fs, pathMod, root, clock, idgen, crypto,
                            astraModel?, expectedOutputTokens?, headroomFactor? })
     estimate({ proposal, advocateModel, criticModel, judgeModel })   -> { ok, estimate? | error }
     run({ roomId, proposal, models, grant, roleInstructions? })      -> { ok, result? | error }
     isAstraModel(modelId)                                            -> boolean */
'use strict';

const DEFAULT_ASTRA = 'gpt-6-astra';
const DEFAULT_EXPECTED_OUTPUT = 400;  // tokens per role turn, COUNCIL.md role shapes are short
const DEFAULT_HEADROOM = 1.25;        // tool-loop headroom multiplier (CONTEXT.md: input + output + headroom)

function makePauliCouncilRunner(deps) {
  const council = deps.council, callModel = deps.callModel, prices = deps.prices;
  const fs = deps.fs, pathMod = deps.pathMod, clock = deps.clock, idgen = deps.idgen, crypto = deps.crypto;
  const root = deps.root;
  if (!council || typeof callModel !== 'function' || !prices || !fs || !pathMod || typeof clock !== 'function' || typeof idgen !== 'function' || !crypto || !root) {
    throw new Error('pauli-council-runner: council, callModel, prices, fs, pathMod, root, clock, idgen, crypto are required');
  }
  const astraModel = deps.astraModel || DEFAULT_ASTRA;
  const expectedOutputTokens = typeof deps.expectedOutputTokens === 'number' ? deps.expectedOutputTokens : DEFAULT_EXPECTED_OUTPUT;
  const headroomFactor = typeof deps.headroomFactor === 'number' ? deps.headroomFactor : DEFAULT_HEADROOM;
  const dir = pathMod.join(root, 'pauli-council');
  const receiptsFile = pathMod.join(dir, 'executions.jsonl');

  const ok = extra => Object.assign({ ok: true }, extra || {});
  const bad = (error, msg) => ({ ok: false, error, msg: msg || error });
  const tokenize = text => Math.ceil(String(text).length / 4); // deterministic chars/4 estimator

  function isAstraModel(modelId) { return modelId === astraModel; }

  function priceOf(modelId) {
    const p = prices[modelId];
    if (!p || typeof p.inputPerMToken !== 'number' || typeof p.outputPerMToken !== 'number') return null;
    return p;
  }

  function turnCost(modelId, inputTokens, outputTokens) {
    const p = priceOf(modelId);
    return (inputTokens * p.inputPerMToken + outputTokens * p.outputPerMToken) / 1e6;
  }

  // The full job priced before anything runs: each role's prompt is what view() lets it see,
  // so input tokens grow per turn; output is the expected per-turn shape; headroom covers the
  // tool loop. The math is IN the estimate object - the owner approves this, not a blank check.
  function estimate({ proposal, advocateModel, criticModel, judgeModel }) {
    if (typeof proposal !== 'string' || !proposal.trim()) return bad('no-proposal', 'proposal text required');
    const models = { advocate: advocateModel, critic: criticModel, judge: judgeModel };
    for (const [role, m] of Object.entries(models)) {
      if (typeof m !== 'string' || !m.trim()) return bad('no-model', role + ' model required');
      if (!priceOf(m)) return bad('unpriced-model', 'no price table entry for ' + m + ' (unknown models are never silently free)');
    }
    if (judgeModel === advocateModel || judgeModel === criticModel) return bad('judge-conflict', 'judge must differ from advocate and critic (COUNCIL.md §1)');
    const proposalTokens = tokenize(proposal);
    const argTokens = expectedOutputTokens; // each prior argument arrives as roughly one role turn
    const turns = [
      { role: 'advocate', model: advocateModel, inputTokens: proposalTokens, expectedOutputTokens, math: 'proposal(' + proposalTokens + ') in, ' + expectedOutputTokens + ' out' },
      { role: 'critic', model: criticModel, inputTokens: proposalTokens + argTokens, expectedOutputTokens, math: 'proposal + advocate in, ' + expectedOutputTokens + ' out' },
      { role: 'judge', model: judgeModel, inputTokens: proposalTokens + 2 * argTokens, expectedOutputTokens, math: 'proposal + advocate + critic in, ' + expectedOutputTokens + ' out' }
    ];
    for (const t of turns) {
      t.costUSD = turnCost(t.model, t.inputTokens, t.expectedOutputTokens);
      t.withHeadroomUSD = t.costUSD * headroomFactor;
    }
    const totalCostUSD = turns.reduce((s, t) => s + t.withHeadroomUSD, 0);
    return ok({
      estimate: {
        proposalTokens, expectedOutputTokensPerTurn: expectedOutputTokens, headroomFactor,
        turns, totalCostUSD,
        astra: Object.values(models).some(isAstraModel)
      }
    });
  }

  function validateGrant(grant, models, estimate) {
    if (!grant || typeof grant !== 'object') return bad('grant-required', 'deny-by-default: no mission-bound owner grant, no tokens (CONTEXT.md)');
    for (const f of ['missionId', 'provider', 'model', 'expiresAt', 'budgetUSD']) {
      if (grant[f] === undefined || grant[f] === null || grant[f] === '') return bad('grant-incomplete', 'grant needs missionId, provider, model, expiresAt, budgetUSD');
    }
    if (typeof grant.expiresAt !== 'number' || clock() > grant.expiresAt) return bad('grant-expired', 'grant expired before the run started');
    if (typeof grant.budgetUSD !== 'number' || estimate.totalCostUSD > grant.budgetUSD) {
      return bad('over-budget', 'estimate $' + estimate.totalCostUSD.toFixed(6) + ' exceeds grant budget $' + grant.budgetUSD + ' - refused before any model call');
    }
    for (const m of Object.values(models)) {
      if (isAstraModel(m) && grant.model !== astraModel) {
        return bad('astra-not-granted', 'an Astra-lane role needs a grant whose model covers ' + astraModel + ' - a cheaper grant does not unlock Pauli');
      }
    }
    return null;
  }

  function appendReceipt(receipt) {
    try { fs.mkdirSync(dir, { recursive: true }); fs.appendFileSync(receiptsFile, JSON.stringify(receipt) + '\n'); return true; } catch (_) { return false; }
  }

  function promptFor(role, visible, instructions) {
    const shape = role === 'advocate' ? 'One sentence thesis + 3 supporting points.'
      : role === 'critic' ? 'One sentence antithesis + 3 risks.'
      : 'Lock the ruling as the COUNCIL.md §3 contract: ruling APPROVE | REJECT | MODIFY (+ new proposal text) | halt, with one paragraph of reasoning.';
    let body = 'PROPOSAL:\n' + visible.proposal + '\n';
    if (visible.advocate_arg) body += '\nADVOCATE ARGUED:\n' + visible.advocate_arg + '\n';
    if (visible.critic_arg) body += '\nCRITIC ARGUED:\n' + visible.critic_arg + '\n';
    const extra = instructions && instructions[role] ? '\nMISSION INSTRUCTIONS:\n' + instructions[role] + '\n' : '';
    return 'You are the ' + role.toUpperCase() + ' in an adversarial three-turn debate (COUNCIL.md). ' + shape + extra + '\n' + body;
  }

  function run({ roomId, proposal, models, grant, roleInstructions }) {
    models = models || {};
    const est = estimate({ proposal, advocateModel: models.advocate, criticModel: models.critic, judgeModel: models.judge });
    if (!est.ok) return est;
    const grantError = validateGrant(grant, models, est.estimate);
    if (grantError) return grantError;

    const started = council.startDebate(roomId, {
      proposal,
      advocateModel: models.advocate, criticModel: models.critic, judgeModel: models.judge,
      expectedCost: est.estimate.totalCostUSD
    });
    if (!started.ok) return started;
    const debateId = started.debateId;
    const usage = { turns: [], totalCostUSD: 0 };

    for (const role of ['advocate', 'critic']) {
      const visible = council.view(roomId, debateId, role).visible; // the protocol's information gate
      const resp = callModel({ model: models[role], role, prompt: promptFor(role, visible, roleInstructions), missionId: grant.missionId });
      if (!resp || typeof resp.text !== 'string' || !resp.text.trim()) {
        return bad('worker-failed', role + ' worker returned no text - debate ' + debateId + ' left open for retry');
      }
      const spoke = council.speak(roomId, debateId, role, resp.text);
      if (!spoke.ok) return spoke;
      if (resp.usage && typeof resp.usage.costUSD === 'number') {
        usage.turns.push({ role, model: models[role], usage: resp.usage });
        usage.totalCostUSD += resp.usage.costUSD;
      }
    }

    const judgeVisible = council.view(roomId, debateId, 'judge').visible;
    const judged = callModel({ model: models.judge, role: 'judge', prompt: promptFor('judge', judgeVisible, roleInstructions), missionId: grant.missionId });
    if (!judged || typeof judged.text !== 'string' || !judged.text.trim()) {
      return bad('worker-failed', 'judge worker returned no text - debate ' + debateId + ' left open for retry');
    }
    if (judged.usage && typeof judged.usage.costUSD === 'number') {
      usage.turns.push({ role: 'judge', model: models.judge, usage: judged.usage });
      usage.totalCostUSD += judged.usage.costUSD;
    }
    let verdict;
    try { verdict = JSON.parse(judged.text); } catch (_) {
      return bad('judge-unparseable', 'judge output is not the §3 contract JSON - debate ' + debateId + ' left open for review');
    }
    const ruled = council.rule(roomId, debateId, { ruling: verdict.ruling, modifications: verdict.modifications, reasoning: verdict.judge_reasoning || verdict.reasoning });
    if (!ruled.ok) return ruled;

    const receipt = {
      receiptId: 'exec_' + idgen(),
      debateId, roomId,
      missionId: grant.missionId,
      grant: { provider: grant.provider, model: grant.model, budgetUSD: grant.budgetUSD, expiresAt: grant.expiresAt },
      estimate: est.estimate,
      usage,
      outcome: ruled.escalated ? 'escalated' : ruled.locked.ruling,
      at: new Date(clock()).toISOString()
    };
    receipt.receiptHash = crypto.createHash('sha256').update(JSON.stringify(receipt), 'utf8').digest('hex');
    appendReceipt(receipt); // fail-open: the in-memory result stands
    return ok({ result: { debateId, escalated: !!ruled.escalated, locked: ruled.locked || null, usage, receipt } });
  }

  return { estimate, run, isAstraModel };
}

module.exports = { makePauliCouncilRunner };
