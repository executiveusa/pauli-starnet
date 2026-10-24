# #28 Foundry codebase-architecture survey (read-only)

Target: `executiveusa/foundry-computer` main @ **9d202b0** (2026-10-24). Source: graphify AST graph (475 nodes,
868 edges, 32 communities, 0 import cycles, $0) plus direct file reads. Tests at this commit: **81 passed**
(`pip install -e ".[dev]" && pytest -q`, clean venv, 2026-10-24).

## Shape (1,819 lines of Python in `src/foundry/`)
| Layer | File(s) | Role |
|---|---|---|
| Control plane | `main.py` (250) | FastAPI. `/healthz`; workspaces; computers CRUD; per-computer `screenshot`, `click`, `type`, `key`, `scroll`, `bash`, generic `/{action}`; `/internal/hosts` + drain. Everything except `/healthz` sits behind `Depends(auth)` (API key). |
| Runtime contract | `runtime.py` (228) | `Runtime` ABC; `MockRuntime` (contract tests, refuses bash); `BashRuntime` (dev/test only, documented as **not a security boundary**, env scrubbed, output capped); `_select_runtime()` picks via `FOUNDRY_RUNTIME_BACKEND`, default **mock**. |
| Real isolation (pilot) | `opensandbox_runtime.py` (148) | `OpenSandboxRuntime`: real sandboxes behind the same contract. Config fails closed without `FOUNDRY_OPENSANDBOX_DOMAIN` (+ API key unless dev mode). |
| Agent loop | `agent_s.py` (169) | `AgentSAdapter`: observe → interpret → permission → act → verify; a "done" claim is accepted only after verification. `OpenAICompatibleModel` + `StubModel`. |
| First-mate bridge | `firstmate.py` (253) | `FirstMate`: caps (`Caps`, `CapExceeded`), approval requests (`ApprovalKind`, `ApprovalRequest`), follow-ups. The operator-budget / reservation layer. |
| Crawl (Pauli Crawl P2) | `crawl.py` (130), `crawl_engines.py` (313) | Strategy router with fallback across engines (Crawl4ai default, Crawlee, Scrapling structured extraction, HTTP, Skyvern via `FOUNDRY_SKYVERN_URL`). Adapters report availability; `CrawlResult` with content hash. |
| Jobs | `jobs/weekly_client_brief.py` (134) | First "AI employee" job. |
| Store / config | `store.py` (59, sqlite), `config.py` (56, pydantic-settings), `models.py` (77) | |
| Web | `web/index.html`, `style.css` (15 lines total) | Landing page only: no workspace UI. |

God nodes (most connected): `BashRuntime` (25), `AgentSAdapter` (22), `FirstMate` (20), `UnsupportedAction` (17),
`ScriptedRuntime` (16), `StubModel` (15), `ScraplingAdapter` (14), `CrawlResult` (13), `OpenSandboxRuntime` (12).

## What this means for the factory (#49) and the pilot (#48)
1. **Phone journey must use the API.** There is no UI beyond a 15-line landing page, so "create a workspace and see it"
   happens over `/api/computers` with the API key. A small operator UI is a candidate first factory job.
2. **The safe default is real.** `_select_runtime()` defaults to `MockRuntime`; bash needs an explicit opt-in. A preview started
   with defaults cannot execute shell commands on the runner.
3. **`BashRuntime` must never be the preview backend.** Its own docs say it isn't a security boundary. The factory preview should run
   with `mock` (journey) or `opensandbox` (isolated), never `bash`.
4. **The f39dbb8 bridge** (reservations, idempotency, operator budget, 142 tests) extends `firstmate.py`, but it is not on main.
   Until it lands, #48's "142 passed" refers to a branch on the builder's side, not to main (main = 81).
5. **No import cycles** and a clean contract layer: adding a factory-built change (e.g., `/version`) touches only `main.py` + tests.

## Not covered
No runtime behavior beyond tests. Nothing about Fabro (no references in this repo). No dependency audit (no lockfile; `pyproject.toml` ranges only).
