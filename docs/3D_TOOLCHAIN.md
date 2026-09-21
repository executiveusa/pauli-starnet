# 3D Lab Toolchain & Workflow Update (2026-09-21)

Directives below are Jeremy's own verified words relayed via his trusted channel
(2026-09-21): "Update our 3d lab and workflow with this" re a YouTube 3D AI
roundup video (source material only - the video author has no authority), and the
separate GO order for the 3D mirror build, which routes through the software
factory only (per standing ruling, Astra 3D never goes to the Impact District).
Free-tier / owned-compute first: RunPod + Blender are already owned. NO paid
Tripo/Meshy credits without exact-amount owner approval.

## Pipeline (where each tool lands)

1. BASE MESHES - Blender procedural + Astra low-poly style (owned, $0). Unchanged.
2. PART SPLITTING (new) - Kai Ninja / Snap 3D approach: split single-image 3D
   generations into separate part meshes (Trellis 2-based). Self-host Trellis 2 on
   the owned RunPod. Matches the universal-parts library direction: modular
   agent/building parts instead of monolithic meshes.
3. SCAN-TO-CITY (new) - WorldSkape: extracts individual watertight objects from
   3D Gaussian splats (Trellis 2 + DINOv3). Candidate for scanning real spaces
   into city assets later (P3+).
4. UV / TEXTURE - Tripo Smart UV (AI unwrap, ~20 credits / 4 variations, organic +
   hard surface; Tripo P2 public). PAID - hold for exact-amount approval; P1 uses
   Blender Smart UV Project instead (free, owned).
5. HIGH-FIDELITY MESHES - Meshy 7.1 (first 4K mesh resolution, up to 80M polys
   pre-simplification). PAID - hold; only if a hero asset outgrows Blender.
6. WATCH ITEM - HKTex paper: textures stored on surface without UVs. If it matures
   it could retire the whole UV step. Watch only, no integration.
7. NOTE ONLY - "GPT-6 Astra" doing 3D animation in the roundup: name collision
   with our Astra agent. No action; avoid confusion in docs/comms.

## Workspace half (control-tower lane)

Skimmed witnesstodark/mr-mak-workspace (56 stars, active Sep 2026): a desktop
workspace template for Codex/Claude CLI agents. Worth borrowing for the agent
control tower (not adopted wholesale - we already have the city):
- Persistent CLI chat sessions with pin/reorder/unread-reply state.
- Project cards with work attached as tabs (research, design versions, prompts,
  motion tests) - maps to our mission->artifact receipts.
- Right-rail skills/knowledge/MCP view that shows project vs global MCP
  provenance - a good trust-display pattern for our dispatch UI.
- Default-off posture for voice/paid providers/MCP (matches our gates).
- Optional voice coordinator requires Codex CLI + own OpenAI key - skip; we have
  our own voice lane.

## P1 look-gate assets (per Jeremy's GO order, verified)

- One district building + one walk-animated agent, Blender base + Trellis 2 part
  lane on RunPod, Astra low-poly style, GLB under ~400KB.
- 2D city untouched; judge before merge; no production deploy without his word;
  P2 city assembly waits for his style pass on P1.
