# StarNet City 3D Mirror - Design Proposal (2026-09-21)
Owner: Bambu. Status: AWAITING OWNER SIGN-OFF. Branch: feat/3d-starnet-upgrade (2D untouched).

## What you asked for, in one line
The exact same city you have today - same districts, same overview, agents walking the same
paths doing the same work - but rendered with modern 3D models instead of pixel art.
Overhead camera, zoom in/out, light enough for your phone, nothing that looks like old
Mario Brothers. Built with what we already own: RunPod + Blender. No new compute purchases.

## ELI5
Today the city is a flat cartoon map. We are going to build a model-railroad version of the
same map: same train schedule, same little people doing the same jobs, but the buildings and
people are real 3D models you can tilt and zoom. Your 2D map keeps running untouched the
whole time - the 3D one is a second window onto the same house.

## 1. Asset pipeline (Blender on RunPod -> phone-friendly GLB)
- Inputs: the 9 districts' canonical layout (city model + station bake) and the agent roster.
- Build: headless Blender scripts on our existing RunPod pod generate one GLB per district
  building (9 total) plus one rigged, walk-animated agent body (one mesh, palette variants
  per citizen - same trick as the 2D sprite pool).
- Style: Astra's already-built worlds set the bar (clean low-poly architecture, baked
  lighting, soft contact shadows). District models match that look so the whole site reads
  as one product.
- Phone budget per district GLB: target <=400 KB (Astra's pauli/low.glb is 245 KB - proven
  feasible); textures atlas-baked, no 4K maps, Draco optional later.
- Cost: RunPod community GPU (A4000-class spot, ~$0.2-0.4/hr). Estimate 6-10 GPU-hours for
  all 9 districts + agent body + 2-3 revision rounds = **~$2-4 total** (estimate, flagged).
  Token cost for pipeline scripting: Groq free lane + Jev cheap lane, **cents**.
- Gate 1 output: 1 district + 1 agent rendered, screenshots to you. PASS = you approve the look.

## 2. Viewer (Astra's Three.js overlay as the base - already paid for)
- We do NOT rebuy the viewer. Astra's overlay (judged, repaired, builds clean Sep 18) is
  ported onto this branch: scene renderer, camera controls, quality tiers, failure policy.
- Camera: overhead orbit (37 deg FOV), zoom in/out buttons + pinch, min/max distance clamps
  - exactly Astra's control contract, retuned for a whole-city frame.
- Mobile performance budget: low tier = pixelRatio 1, no shadows, <=150k triangles on screen;
  standard tier opt-in. Astra's adaptive-downgrade logic (drops resolution if frames lag)
  comes along as-is. First paint target: <=2s on your phone on LTE.
- Already on the branch (groundwork, done today): vendored Three.js 0.180, the vanilla port
  of Astra's CanvasScene (world3d.js), Astra's 3 GLB worlds, the 3D page shell at /city/3d/.

## 3. Agent motion (the contract Astra left open - we wire it)
- Same truth rules as the 2D floor, verbatim: the bridge polls the gateway's public
  read-only status feed; an agent moves ONLY when the gateway evidences it (task running
  with that agent's name). Nothing animates on invention.
- What you see: agent at their desk; a real mission starts (the 24/7 dispatcher now feeds
  this) -> the agent WALKS to the district building's work point; mission ends -> walks
  home. Walking = the Blender-built walk cycle, lerped along the same evidenced endpoints
  the 2D floor uses (desk <-> work point).
- The motion layer is already sketched on the branch (agent-bridge.js): golden-angle home
  spots, gateway diffing, no fabricated idle strolling in v1.
- Token cost: zero new - rides the existing free dispatch lane.

## 4. District mapping (sitewide, same code everywhere)
- One scene module, one motion contract, one quality budget - every district gets the SAME
  upgrade: its Blender-built 3D building drops into the shared world at its canonical
  district position, agents bound to that district walk to it.
- No district keeps custom/old rendering. The district list in the viewer is generated from
  the canonical city model, so a 10th district later is a config line, not new code.

## 5. Phases, gates, and what you see
- P0 Groundwork (DONE today, $0): branch, Three.js vendored, Astra port, page shell,
  motion-bridge skeleton. You see: nothing public; code receipts only.
- P1 Look gate (~$1-2 GPU): one district + one walking agent, Blender-built, on the branch.
  You see: screenshots + a preview link on the temp server. PASS = your thumbs-up on style.
- P2 City assembly (~$1-2 GPU): all 9 districts modeled + placed, overhead camera tuned.
  You see: the whole 3D city from above, zoomable, on the preview link.
- P3 Live motion ($0 new): dispatcher missions drive walking agents end-to-end.
  You see: agents walk when real work runs - same moments the 2D floor moves.
- P4 Judge + polish: independent judge pass (code + visuals + honesty rules), fixes.
  You see: the judge report.
- P5 Merge candidate: PR toward main. NOTHING deploys to production without your word.
- Total estimate: **~$2-4 GPU + cents of tokens** (estimates, flagged; RunPod already owned).

## Standing gates (unchanged)
2D untouched - independent judge before any merge - no production deploy without your word -
no paid model spend without exact-amount approval - no new compute purchases.
