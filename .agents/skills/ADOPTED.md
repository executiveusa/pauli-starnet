# Adopted external skills

Ledger of skills adopted from outside this repo, and the standing adoption path for future ones.

## Guard (standing)

Every NEW skill folder entering this tree must pass SkillSpector before merge:
run `skill-guard <skill-folder>` on prod-city-1 (wrapper at /usr/local/bin/skill-guard,
SkillSpector v2.12.0 in /opt/skillspector). Gate rule: score < 70 or any critical
finding = do not adopt; take to the owner. The ship gate (OCR PR review) still applies
on top of this guard.

## KB-first contract

Agents must answer from the Supabase knowledge base before generating: query the
gateway endpoint `/v1/knowledge/search` (already wired at dispatch time by the
foreman). The code-structure side is mapped by Graphify (output in
`graphify-out/`, regenerate with `graphify .`).

## Picks from the "8 githubs" set (adopted 2026-10-15)

| Skill | Source | License | Why |
| --- | --- | --- | --- |
| grill-me | github.com/mattpocock/skills (skills/productivity/grill-me) | MIT | Relentless interview that sharpens a loose plan before any build |
| impeccable | github.com/pbakaus/impeccable | Apache-2.0 | Design critique/audit pass for the design stage |
| brag | github.com/latent-spaces/brag | MIT | Turn a project into a short shareable launch video (proof-of-work clips) |

Files are copied verbatim from upstream with attribution here; upstream docs for
grill-me are kept in `.agents/skills/grill-me/references.md`.

Pattern steal (no code adopted): OpenRig (github.com/mvschwarz/openrig, Apache-2.0)
- its team/role model for orchestrating agent crews is the reference for the
factory design; revisit when the factory lane is specced.
