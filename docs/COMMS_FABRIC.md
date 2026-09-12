# Agent comms fabric: MCP Agent Mail (ADOPTED 2026-09-12)

Owner directive: "upgrade all the agents so they can talk to each other and
communicate and plan - they should be able to have a meeting."

## What was adopted

[Dicklesworthstone/mcp_agent_mail](https://github.com/Dicklesworthstone/mcp_agent_mail)
(v2.13.0.2, Python/FastMCP, HTTP-only server) as the city's communication
fabric: per-agent identities, inboxes, threaded markdown messages, advisory
file reservations, and a **git-backed audit archive** of every artifact.

License: MIT with a custom rider denying rights to OpenAI, Anthropic and their
affiliates. Fine for our own fleet. Re-check per repo before any client
resale/hosting.

## Scratch proof (this sandbox, 2026-09-12)

Ran the server (`uv run python -m mcp_agent_mail`, port 8765, bearer auth) and
exercised the whole loop over MCP JSON-RPC:

- registered two agents (server assigns memorable names + per-agent tokens;
  sends without the agent token are refused)
- foreman posted a meeting message, worker fetched inbox, replied in-thread
- exclusive file reservation on `gateway/server.js` granted, with the honest
  warning that code-path exclusivity is advisory until the pre-commit guard
  is installed
- every artifact (agent profiles, messages, reservation) committed to the
  git archive - human-auditable

Then ran `scripts/agent-meeting.js` (this repo) with HEISENBERG, MERCI and
BEACON: chair posted the agenda, both participants acknowledged in-thread,
transcript persisted. Note: the fabric enforces a contact-request handshake
before first direct messaging between two agents.

## How the city uses it

- `shared/agent-mail-client.js` - zero-dependency MCP-over-HTTP client.
  Every city agent gets one; `AGENT_MAIL_TOKEN` comes from Infisical
  (HERMES prod key `AGENT_MAIL_BEARER`), never hardcoded.
- `scripts/agent-meeting.js` - convenes a meeting: registers participants,
  chair posts the agenda, participants reply in-thread. This is the
  "agents can have a meeting" primitive Heisenberg calls before parallel
  missions and after reviews.
- Heisenberg holds the chair by default: decomposes the mission (see
  docs/BEADS_DAG.md), mails assignments, collects receipts in-thread.
- File reservations signal build intent so two workers don't collide on the
  same files; install the fabric's pre-commit guard for authoritative
  enforcement on repos where collisions hurt.

## Deployment (VPS - NOT YET DEPLOYED, flagged for owner)

`deploy/agent-mail/mcp-agent-mail.service` (systemd, 127.0.0.1:8765 only,
CPUQuota 50% / MemoryMax 768M to respect the 2 vCPU / 8 GB box) and
`deploy/agent-mail/env.example`. The bearer token goes in
`/etc/mcp_agent_mail/env` (mode 0600) from Infisical. Localhost-only: agents
on the box reach it directly; nothing public is exposed. If the Windows
desktop or Orgo computers need access later, that is a separate tailnet
decision, not a Caddy rule.

Do NOT use the project's one-line installer on the VPS: it edits shell
profiles, replaces `bd` with `br`, and auto-wires agent tools. Install with
`uv` into `/opt/mcp_agent_mail` exactly as the unit file expects.
