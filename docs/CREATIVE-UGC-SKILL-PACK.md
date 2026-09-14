# Creative / UGC Skill Pack — Brownfield Spec

Status: SPEC ONLY — no production grants changed.
Classification: USE (shared platform)

## Outcome
Give ASTRA and StarNet creative agents a vetted, discoverable UGC/Higgsfield procedure pack without bypassing StarNet's existing room/capability governance, skill lifecycle, consent gates, or provenance review.

## Baseline discovered
StarNet already has the primitives this work needs:

- Rooms are capability scopes; placed objects are real grants.
- `studio` grants media tools; `notebook` grants the skill library; `orchestrator` grants delegation/subagent/city controls.
- Runtime skills are per-agent procedure documents managed by `skillstore`, with provenance, trust source, review state, support files, lifecycle, curation, and approval handling.
- `skillreview` already performs a restricted post-run adversarial/lesson pass.
- The curator explicitly prefers class-level umbrella skills over one-session micro-skills.
- Team/subagent tools already exist; this feature must reuse them instead of adding another orchestration system.

## Correct district mapping
The user calls these districts. In StarNet's implementation, the safe mapping is existing capability-scoped rooms.

### Creative Studio room
Use for agents that plan or inspect creative media.

Required objects:
- `computer` — compute + task plan + tool discovery
- `notebook` — runtime skill list/view/manage
- `studio` — image analysis/generation + voice generation
- `dish` — only when web/reference research is part of the job

Do NOT add provider-spend or publishing authority merely because a creative skill exists. Skills teach procedure; room objects grant capability.

### Creative Director / Lead room
Add `orchestrator` only to the lead that is allowed to dispatch reviewers/workers. This lets ASTRA route a brief to specialist subagents while preserving one-level delegation, existing budgets, and consent gates.

### Adversarial reviewer
Use the existing worker/subagent path plus `skillreview`/verdict review. Reviewer must not be the same agent that produced the candidate when a release verdict is requested.

## Source intake policy
Every source enters a quarantine/review lane before becoming a StarNet runtime skill.

| Source | Intended use | License/reuse rule |
|---|---|---|
| `joebenscoter86/higgsfield-ugc-workflow` | UGC workflow decomposition: product profile, brief, base character, storyboard, multicut script, ad/video/enhance | MIT verified. May adapt with attribution and provenance. |
| `AKCodez/higgsfield-claude-skills` | Idea mining for cinematic, ecommerce, social-hook, product and brand-story procedures | No license found during intake. Concepts only; write original procedures. Do not copy skill text. |
| `harshith-vaddiparthy/UGC-dashboard` | Interaction/workflow patterns and UGC dashboard concepts | License file exists; verify license text before code reuse. Prefer original implementation even if permissive. |
| GitHub Higgsfield topic | Discovery feed | Never bulk-install. Each candidate gets source + license + security review. |
| MaxFusion | Product benchmark | Benchmark behavior/outcomes only. Do not copy proprietary design/code/copy. |

## Skill architecture
Do not dump many upstream skills into ASTRA's always-on prompt. Normalize into a small umbrella set so ASTRA sees metadata and loads bodies on demand.

### 1. `UGC Creative Strategy`
Purpose: product truth → pain → mechanism → offer → angle matrix → hook candidates.
Support files:
- `references/hook-patterns.md`
- `templates/angle-matrix.md`
- `templates/brief.md`

### 2. `UGC Character Continuity`
Purpose: define a repeatable creator/character identity and continuity constraints across shots.
Support files:
- `templates/character-card.md`
- `references/continuity-checklist.md`

### 3. `UGC Storyboard and Multicut`
Purpose: angle → beat sheet → shot list → continuity-safe multicut script → platform aspect ratio.
Support files:
- `templates/storyboard.md`
- `templates/multicut.md`

### 4. `Higgsfield Prompt Direction`
Purpose: translate approved creative intent into provider-ready shot language: subject, environment, camera, motion, light, pacing, negative constraints, aspect ratio. Provider-specific claims must be tested before becoming durable rules.
Support files:
- `references/camera-language.md`
- `templates/shot-prompt.md`

### 5. `UGC Adversarial QA`
Purpose: independent critic checks hook clarity, product truth, continuity, visual legibility, claim safety, platform fit, and whether the output actually beats the previous candidate/reference on the named goal.
Support files:
- `templates/critic-card.md`
- `references/failure-modes.md`

## ASTRA routing contract
ASTRA should route by intent, not memorize the imported repositories.

1. Search/list skill metadata.
2. Load only the umbrella skill required for the job.
3. If research is needed, require a room with `dish`.
4. If media inspection/generation is needed, require `studio`.
5. If delegated review is needed, require lead `orchestrator` and dispatch an independent reviewer.
6. Planning/research may run without provider spend.
7. Any external write, generation, publish, purchase, or consequential mutation remains governed by the existing host capability/consent policy.
8. After a substantive run, use existing skill review to patch the governing umbrella from verified lessons; do not create a session-specific skill unless no umbrella fits.

## Training / hardening loop
For each umbrella skill:

1. Seed from verified source material and original synthesis.
2. Record `sourceUrl`, source version/commit, author, license and digest where supported by the native store.
3. Run a representative task.
4. Dispatch an independent critic subagent.
5. Convert critic findings into procedural patches only when demonstrated by the task evidence.
6. Run `skillreview` and curator; merge overlapping micro-skills into the umbrella.
7. Pin only after the skill survives the acceptance suite.

## Acceptance tests
A skill pack is not accepted until all are true:

- ASTRA can discover the relevant umbrella from metadata without preloading all bodies.
- A creative room without `dish` cannot silently browse.
- A creative room without `studio` cannot silently generate/analyze media.
- A worker without `orchestrator` cannot fan out more workers.
- No-spend planning works with no media provider call.
- Provider/media generation still reaches the normal consent gate.
- A critic run is performed by a separate worker for gauntlet verdicts.
- Provenance and license fields are populated for adapted third-party material.
- Unlicensed source text is not copied into runtime skills.
- Curator does not proliferate duplicate narrow skills.

## Definition of done
- Five umbrella procedures installed through StarNet's native skill lifecycle, not hardcoded into a global system prompt.
- Creative room/capability mapping documented and tested.
- ASTRA routing prompt points to skill discovery + room requirements.
- Independent adversarial review path verified.
- Provenance/license manifest present.
- Tests prove capability boundaries and no-spend planning behavior.
- No production station layout or live agent grants changed without explicit Commander approval.

## Rollback
This slice is additive. Before any live application, snapshot station layout and skill metadata. Rollback means archive/remove the new skill-pack versions and restore the prior room layout; no existing capability registry entries need to be deleted for this feature.