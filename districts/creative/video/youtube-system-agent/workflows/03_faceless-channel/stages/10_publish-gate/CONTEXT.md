# 10_publish-gate - prepare exact public state

One job: present channel, title, thumbnail, description, master, audience and timing together.

## Inputs
- Working: `../09_rights-policy-qa/output/release-package.md`
- Reference: `../../../../_shared/brand/four-gates.md`

Do NOT load: other workflows' run outputs or the whole corpus.

## Process
1. Read only the named inputs.
2. Do this stage's one job and record evidence/uncertainty.
3. Write the named artifact and a gate record.

## Outputs
- publish-decision.md → output/
- gate.md → output/

## Human check
Bambú approves or rejects the exact public state; do not publish from this stage. Edit the artifact in place; the next stage reads the approved version.
