# Model Choice: Claude Fable 5.2 vs Claude Opus 5.5

**Recommended:** Claude Opus 5.5 (`claude-opus-5-5`) as the **primary implementation/coding agent**; Claude Fable 5.2 (`claude-fable-5-2`) for difficult architectural audit, deep consolidation, hard blockers and independent high-level review when needed. Keep routine worker tasks on appropriately cheaper models after real evaluation.

Why: Anthropic's current official guidance describes Opus 5.5 as especially suitable for multihour autonomous coding and complex systems engineering. It recommends starting with Opus and escalating to Fable for the most challenging reasoning and long-horizon work when Opus at high effort falls short. Fable is powerful but does not replace durable task management, credentials, tools and a server that stays running.

**Suggested operating sequence:**

1. Give the whole ZIP to an agent environment with real GitHub/server tools and Opus 5.5 selected. Ask it to start with Phase 0 and implement the first working vertical slice.
2. Ask Fable 5.2 to independently review the consolidation/authority design if there are conflicting service owners or a hard integration blocker. Fable can also advise on large-scale migrations.
3. Run implementation in persistent CLI/agent runtime or Claude Code equivalent with GitHub and authorized SSH/Coolify connections. A standalone Claude chat alone cannot ensure overnight execution.
4. Demand direct evidence of production connections, test IDs, and rollback before saying DONE.

Official sources reviewed November 13, 2026:
- https://platform.claude.com/docs/en/about-claude/models/choosing-a-model
- https://platform.claude.com/docs/en/models/overview
- https://www.anthropic.com/claude-fable-and-mythos-5-2

No promise is made that any one model will autonomously complete all phases in a single context/session. Persistent Paperclip missions and actual worker execution are the intended solution to that limitation.