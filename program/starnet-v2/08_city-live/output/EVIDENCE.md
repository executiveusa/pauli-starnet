---
stage: 08_city-live
status: blocked
blocker: builder - deploy this branch to the VPS gateway, send one real [district:<x>] mission, and capture the live city (screenshots or a recording) showing that district's agent go to work and stop when it settles, next to GET /v1/board; the board panel in the command center reads GET /v1/board
built_by: claude-session-01UT634v
verified_by:
commit: executiveusa/pauli-starnet@claude/multi-agent-architecture-qc3xrf
proof:
  - node test/city-live-board.test.js -> 40/40 (real gateway + stub foreman held open: the mission runs on the creative agent in /v1/city/status, survives the public Netlify DTO as "Quill", lands in CityCore.worldWorkSet, is released on settle; /v1/board counts it and its $0.04 spend)
  - gateway-missions 34/34, e2e.foreman-mission 14/14, gateway-activetasks 21/21, gw-function 104/104, city-web 156/156, spend-and-kill 41/41, factory-intake 32/32
---
Movement on real events: every mission the desk accepts is now a city task (it was invisible before: only direct
/v1/heisenberg/tasks reached the city). It binds to the roster agent of the district it was routed to ("[district:x]"),
else to Heisenberg; the 2D world's existing work path walks that body to its post and releases it when the run ends.
The intent text never leaves the gateway.

Board (GET /v1/board, behind the bearer): dollars from a captain-only revenue ledger (POST /v1/revenue; ref = order id,
never a buyer), outcomes from the mission desk, factory products from intake exit verdicts (POST /v1/factory/intake/settle;
done needs the judge AND the security receipt paths), spend from gateway/spend.js. An empty ledger says has_data:false.

Open, for world-v2 (D17): an agent visiting ANOTHER district's building for a tool it lacks needs a world.js visit API;
idle bodies still stroll their own zone (the desktop's idle engine), where the PRD says an idle agent stands still.
Both land with the 3D world branch, not in the shipped 2D renderer.
