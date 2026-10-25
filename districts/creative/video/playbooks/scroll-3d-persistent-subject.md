# Scroll-3D persistent subject: playbook

Status: PROPOSED for districts/creative/video/playbooks/. Source: the 2026-10-06 tutorial teardown.

## Evidence rule (hard)
VERBATIM/OBSERVED = seen in the tutorial recording (https://www.youtube.com/watch?v=slentvTk3gY, Minh Pham, Figma -> Dora). INTERPRETATION = our template choices. Never present our numbers as Minh's. NOT recovered: exact keyframe offsets, camera coordinates/FOV, easing curves, full GLB hierarchy, axis of the 60-degree rotation example, every z-index.

## No-assets boundary (hard)
Technique only. Do not copy Minh's wasp model, flower/leaf art, typography, colors, page copy or exact choreography. Use original or licensed/owned assets with recorded provenance. The original demo is described as desktop-only; that is not permission to ship a phone-broken derivative.

## The effect in one line
One persistent transparent 3D subject sits in front of a long scrolling document. The page moves behind it; scroll drives the CAMERA and a separate scene-ROTATION track; the subject's own model animation plays independently. Result: the subject appears to ride the whole page.

## Layer stack, back to front (observed, 8 functional categories)
1 page/canvas ground, 2 section artwork, 3 guide-line grid, 4 hero type/content, 5 numbered story sections (opacity-keyed on arrival), 6 persistent transparent 3D widget, 7 nav mask, 8 nav controls.

## Our stack contract (our numbers, not Dora's)
0 ground + backgrounds / 10 decorative rails / 20 chapters + text / 30 subject canvas (pointer-events:none) / 40 intentional foreground labels and CTAs / 50 nav mask / 60 nav controls.
Page root isolation:isolate. Opaque backgrounds under the canvas. Canvas never inside a transformed or clipped hero wrapper. One Canvas for the whole story, never one per chapter. Keep a text-safe corridor and CTA hit areas clear of the subject path.
Root-level fixed canvas (inset:0) for a single landing page. Sticky full-viewport stage scoped to a story wrapper if the effect must end before a footer. Verify clipping and transformed ancestors; a bigger z-index does not fix them. Mobile: use measured/dynamic viewport height and recompute framing on viewport change.

## Three independent drivers
- Scroll -> camera position/target (per-segment keyframes + easing).
- Scroll -> scene/subject orientation (rotation track keyed at the same positions as camera keys).
- Local clip -> imported model animation, played with the mixer on frame delta. Do not assume it is scrubbed by scroll.
- Text opacity: its own per-chapter progress, not a page-wide fade.

## Timeline contract
Chapters have stable IDs; measure document anchors after fonts/layout settle; re-measure on resize/content change. Scroll position lives in a ref, not React state per frame.
Segment [s0,s1]: u = clamp((scrollY - s0)/(s1 - s0), 0, 1); apply easing E(u); interpolate camera position/target and subject orientation (quaternions, not angle jumps). Handle zero-length segments explicitly.
In the frame loop: apply camera transform + look-at, apply the outer subject group orientation, update the animation mixer separately. Put the model under an outer scroll-driven group so its embedded animation cannot overwrite that root transform. Do not multiply world Y by page scroll to "bring it down".
Direct progress mapping first; add short, frame-rate-independent smoothing only after unsmoothed passes. Reverse scroll and scrollbar jumps must reach the same pose, no drift. Native scroll stays the baseline; no scroll-hijacking required.

## Reusable template work package (proposed for scroll3d-pages)
1 persistent-stage reference doc (this file's content). 2 components: ViewportStage, ChapterDocument, ScrollDirector, SubjectRig, plus a pure evaluateTimeline(anchors, poses) utility with no page-copy dependency. 3 motion.schema.ts: asset provenance, chapter id, start/end anchor, camera position/target, subject quaternion/scale, easing id, visibility, label opacity; separate desktop/mobile tracks. 4 original sample scene (procedural shape or owned/licensed model). 5 persistent-flight acceptance fixture + debug overlay (chapter, local progress, camera, projected bounds), off in release. 6 integrate into Kupuri Monarch only after reading its current source (hero-scoped? clipped? remounted? opaque?). The missing effect there is an owner observation, not a diagnosis.

## Acceptance gates (a build does not ship without these)
Functional: one canvas across all chapters; subject visible through full down and reverse scroll; scrollbar jump = same pose; resize keeps chapter alignment; camera, scene and local clip do not fight; footer handoff deliberate; model/WebGL failure leaves readable content.
Visual: inspect actual pixels at hero, every chapter midpoint and boundary, and the close. Narrow phone, wide desktop, portrait/landscape, a real phone. Check full subject bounds and text/CTA safe zones. Capture reverse-scroll and fast-jump.
Accessibility/perf: native wheel/touch/keyboard scroll; semantic content stays in the document; canvas is not a keyboard trap; prefers-reduced-motion = static pose, no optional travel/flapping; poster or no-3D fallback; cap render resolution, pause when hidden, set model/texture budgets from measured phones.

## Carrying it to video and games (INTERPRETATION, ours)
Not demonstrated in the tutorial; these are transfer rules for agents:
- Video: treat the same chapter table (id, start, end, camera pose, subject pose, easing, label opacity) as a shot list. Time replaces scroll as the progress variable; the pure evaluateTimeline function is reused as-is. One continuous subject across shots beats cutting between per-shot scenes. Hyperframes (districts/creative/hyperframe-station) is the render path; pair with realism-doctrine.md and the prompt generator for AI-generated shots.
- Games: input/position replaces scroll as the progress variable (e.g. level progress or player distance). Same separation of camera track, subject-orientation track and local animation clip, same fixed anchors, same reverse/jump determinism test, same fallback and performance budgets.
- Anything else: define the single progress variable, keep tracks independent, evaluate them from a pure function, gate on pixels.

## Sources
https://www.youtube.com/watch?v=slentvTk3gY ; https://help.dora.run/en/articles/9439113-keyframe ; https://help.dora.run/en/articles/9439079-import-from-figma ; https://help.dora.run/en/articles/9439029-constraint-layout ; https://r3f.docs.pmnd.rs/api/hooks ; https://threejs.org/docs/pages/AnimationMixer.html ; https://developer.mozilla.org/en-US/docs/Web/CSS/position ; https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion
