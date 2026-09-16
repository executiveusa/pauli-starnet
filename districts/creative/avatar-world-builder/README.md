# Avatar World Builder

Reusable, ICM-governed production system for assembling a personalized interactive avatar world from compatible parts.

## Product formula

`Shell + Camera + Lights + World + Avatar + Wearables + Props + Companion + Motion + Audio + Copy + Navigation + Policy + License + Budgets`

## Start here

1. Read `CONTEXT.md` and select a template in `factory/`.
2. Build a scene manifest in `products/<client>/scene.yaml` using `_shared/PARTS_CATALOG.yaml` IDs.
3. Present two or three compatible, license-screened options per requested part to the human; record their choice.
4. Validate asset compatibility, license ledger, performance budget, and visual proof.
5. Release only under `RELEASE_APPROVAL.yaml`.

## Truthful capability labels

Every avatar must state `rig: none`, `rigged`, or `vrm-humanoid`. A static GLB must not be marketed as a character performing articulated motions.

## Current product

`products/synthia-alex-v1/scene.yaml` captures the existing Alex experience as a composition record. The present avatar is a static baked model; it is not a swappable wardrobe system yet.

## Catalogs

- Part IDs and compatibility contracts: `_shared/PARTS_CATALOG.yaml`
- Open-source and open-asset sources: `_shared/OPEN_SOURCE_SOURCES.md`
- Client manifest template: `factory/skin.template.yaml`
