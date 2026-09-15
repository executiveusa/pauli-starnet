# Pauli ICM architect workspace

One job: turn read-only watcher and fleet evidence into sourced architecture findings for human review.

## Form
Context map + finding record library + five-stage pipeline.

## Run
1. Copy `_templates/watch-run/` into `runs/<timestamp>-<scope>/`.
2. In order: ingest -> verify -> cross-examine -> propose -> report.
3. Stop at each stage's human check. Outputs are edit surfaces.

## State
Run state is only what exists under `runs/*/*/output/`. Finding state is file location plus frontmatter under `findings/`. `_index.jsonl` is generated, never hand-edited.

## Constraints
Read `_meta/authority.md`, `_meta/privacy-boundaries.md`, and `_shared/evidence-rules.md` before every run. $0 deterministic processing is default. A missing free synthesizer leaves the run queued.
