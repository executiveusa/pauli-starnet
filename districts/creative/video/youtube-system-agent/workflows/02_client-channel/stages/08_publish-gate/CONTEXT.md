# 08_publish-gate - prepare exact publish decision

One job: present the final channel, video, title, thumbnail, description and timing together.

## Inputs
- Working: `../07_qa/output/release-package.md`
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
Bambú approves or rejects the exact public state; approval must be recorded before any publish action. Edit the artifact in place; the next stage reads the approved version.
