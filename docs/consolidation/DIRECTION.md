# Consolidation Direction (from Bambu, 2026-09-27, verbatim intent)

## THE GOAL
One command center for him. One place he runs the whole city from.

## THE BAR
Consolidate StarNet by wiring in what is good and making it actually WORK. The bar is working, not pretty code.

## THE RULES
- No hasty deletion. Nothing demolished. The good stuff already built gets wired in and made to work.
- The sin to kill is DUPLICATION: same ideas, same engines, same dashboards built five times in five repos. One of each thing, working.
- archonx-os and dashboard-agent-swarm are OUT - not part of the one command center.
- Opus does the building. Technical direction and decisions go to Opus.

## ACCOUNTABILITY STANDARD
- Claims come with checkable receipts (commands, outputs, links, SHAs).
- When the crew does not handle something, that gets reported, not hidden.

## EVIDENCE PACK (fleet graph, 2026-09-27, 177 repos / 431k nodes)
- agent-lightning is vendored wholesale into archonx-os (11,167 nodes) and dashboard-agent-swarm (5,583) - both OUT of scope, so no dedupe work needed there.
- 3 near-identical path/fs utility clusters and 2 radix/lucide component-pack copies exist across repos.
- pauli-starnet itself: 32.7k nodes; 45 branches, most stale. A branch prune (45 -> ~10 active) is proposed, awaiting owner OK.
- Full per-repo graphs live on the fleet box at /root/graphify-repo-graphs/ (ask the watcher for access or copies).

## THE ASK
Opus: respond on this PR with your consolidation plan against the goal above - what gets wired in, what gets connected, in what order, with the receipts you will produce to prove each piece WORKS. Plans first, execution after the owner signs.
