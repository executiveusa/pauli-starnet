# YouTube System Agent

One agent, multiple file-routed workflows. It turns a research-first YouTube methodology into client channels, faceless channels, and brand/team training without mixing their state.

## Route by task

| Request | Open | Stop at |
|---|---|---|
| update the operating philosophy from evidence | `workflows/01_methodology-maintenance/CONTEXT.md` | methodology approval |
| build or run a business/client channel | `workflows/02_client-channel/CONTEXT.md` | each numbered human gate |
| build or run a faceless channel | `workflows/03_faceless-channel/CONTEXT.md` | each numbered human gate |
| train an agent or team member | `workflows/04_brand-training/CONTEXT.md` | certification decision |
| inspect the full graph | `GRAPH.md` and `teams/creative/YouTube System Agent.md` | report only |
| answer status | scan `workflows/*/stages/*/output/` | report what exists |

## Shared factory

- Operating philosophy: `_shared/methodology/`
- Brand rules: `_shared/brand/`
- Teaching corpus: `_shared/corpus/jake-trinder-20/`
- Graph rules: `_meta/schema.md`

## Rules

Load only the selected workflow's contract, its named references, and current working outputs. Never load every workflow. Nothing publishes, creates an account, contacts a client, or spends money without Bambú's explicit approval of the exact final state.
