# Fictional architectural worlds — generatedasset provenance

These are actual self-contained GLB 2.0 meshes, not screenshots, commercial-site scans, map data or purchased architectural models. All six architectural files were procedurally authored specifically for this task by the World Builder agent using Three.js geometry and GLTFExporter. They are **original generated geometry**, not sourced artist-made architecture. No real location or building identity is asserted. No paid media API was used. No third-party model input was used in the architectural shells.

## Authored design

- **Pauli's Place:** fictional terraced waterfront work/cultural campus; beveled round-corner floorplates, setback headquarters, recessed glass ribbons, brass mullions/coping, research colonnade, oval cultural forum, sculpture court, bridge, planted terraces and stepped waterfront/jetty.
- **Polly's Place:** explicitly fictional story campus; warm closed-thickness barrel-vault stage, aligned brass ribs, limestone opening rims/bearing piers, supported stage portal, rehearsal steps, staggered story house and connected timber pergola. Not an existing production studio and no operational data borrowed from Pauli.
- **Officina de Bambu:** generic office concept only; timber screens, shelves, desk, seating and garden strip. Contains no personal, connector, account, calendar, mission or Pi data. Application only requests/renders it when its caller supplies `authenticated === true`. Because the geometry is generic, its GLB is public; this is a UI gate, not protection for secret assets.
- **Seattle:** no mapping, assets, navigation, prefetch or inferred identity.

Two LODs are exported per world; merge-by-material produces seven meshes/draw primitives per authored world. Low selectively merges/removes subpixel mullions, bollards, dock joints, planting and screen members while retaining the main silhouettes; large low-tier curved slabs have an extra corner segment. PBR materials separate low-roughness blue-green glazing, matte limestone/plaster, satin timber, brushed bronze and woven upholstery. Officina has a beveled slim desktop, recessed apron, narrow trestles, a footed sofa with separate seat/back cushions, and captured screen rails/end posts.

There are no embedded textures in the authored GLBs. `bake-contact.py` locally generates one 256×256 RGBA analytic floor-contact PNG per world using Pillow; no downloaded or generative-model image input is involved. These are soft static footprint approximations, not ray-traced ambient occlusion. Both tiers load the appropriate tiny PNG in addition to their GLB (one extra draw call). A local static environment and island contact gradient remain generated at runtime; standard also uses a directional shadow map updated once. There is no animation, rig, operational marker, decoder dependency or external asset URL in the shells.

The renderer remains demand-driven. Low stays DPR 1 on desktop; phone viewports ≤480 CSS px cap DPR at 1.25 (or native DPR if lower). The local Chromium comparison is in `evidence/visual-repair/render-results.json`; this is not physical Android performance certification. Do not infer a constant frame rate from CPU submission timings.

`manifest.json` records exact bytes, SHA-256, triangle counts, bounds, pivot, material/primitive counts and node names. Node IDs refer to material-merged architecture, not approved operational entities. Binding registries remain empty.

## Optional acquired prop: Sheen Chair

Only `/worlds/officina/sheen-chair.glb` is acquired. It is not initially loaded, and is not part of any authored-shell byte figure. It is requested only when Officina is explicitly authenticated and standard detail is selected.

- **Credit:** Sheen Chair, 2020 Wayfair LLC / Eric Chadwick. Fictional product.
- **License:** [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/).
- **Immutable original:** https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/c6a6bd13ab2b3c685c7903d03561b8a9392f38b8/Models/SheenChair/glTF-Binary/SheenChair.glb
- **Per-asset license evidence:** https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/c6a6bd13ab2b3c685c7903d03561b8a9392f38b8/Models/SheenChair/README.md
- Mobile derivative supplied by the prior `visual-assets` scout, copied without byte changes. Prior transformations: simplification, 256px embedded textures, default mango material, missing-UV AO reference removed. Runtime scales this fictional furnishing 2.5× to fit the concept geometry.
- Exact derivative: **628,188 bytes**, SHA-256 **5d8141292c37cd60b3bc79d95742424bde1c048174052145f3b6208e28587e2d**, **17,969 triangles / 4 primitives**; approximately 2,271,912 RGBA8 texture bytes with mipmaps, not total GPU allocation.
- Khronos validation: zero errors; one generated-tangent-space warning retained and disclosed.

No acquired plant or lamp is shipped or loaded. Original task geometry is task output; no third-party copyright notice or license grant is fabricated for it.

## Reproduce

From source, with Three 0.180.0 installed by the integrator:

```sh
node tools/world-assets/build-worlds.mjs
```

The generator invokes `python3 tools/world-assets/bake-contact.py` (Pillow is a build-only local prerequisite) then exports six GLBs. It does not access the network or change runtime dependencies. It preserves the already supplied CC0 chair file and incorporates its hash into the manifest. The manifest also records PNG sizes/hashes and their original generated provenance. Do not ship tools/node_modules, local preview bundles or evidence screenshots as runtime assets.

For the finish-pass evidence, run `node tools/world-assets/validate-repair.mjs` and `node tools/world-assets/verify-repair.mjs`. The latter rebuilds the current application scene components into a local art harness, not an old cached preview, and captures desktop standard plus phone low at native DPR 1 and 3 (render cap 1.25). Independent visual approval is separate; this repair does not change the critic's HOLD verdict.
