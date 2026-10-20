# MotionVideo - Creative District tool lane

Motion graphics, explainers, showreels and branded video built with the MotionVideo skill pack. Draft-and-review only: renders and anything published need owner review.

## Where it lives (a pointer, not a copy)

The owner bought the pack (personal licence). The licence forbids publishing pack files, so **no pack file is ever committed to this repo** (skills, starter assets, fonts, scripts). Agents use the user-level install on the server:

| What | Where (prod-city-1, root) |
|------|---------------------------|
| 9 pack skills (motion-video entry, system, storyboard, craft, review, remotion, hyperframes, editframe, fframes) | `/root/.claude/skills/motion-*` (copy at `/root/.motionvideo/skills`) |
| Account CLI | `/root/.local/bin/motionvideo` |
| MCP server | `node /root/.motionvideo/cli/bin/motionvideo-mcp.js` |
| Session | `/root/.config/motionvideo/session.json` (mode 600, 7-day life) |

Install steps for a new machine: `INSTALL.md` here. Start with the `motion-video` skill; it routes to the others.

## How an agent uses it

1. Brief a motion piece? Read `motion-video` first, then storyboard -> system -> craft -> renderer skill -> review.
2. Need ideas? Use the 703-prompt library (MIT, yihui-dev/awesome-opus5-5-videos) in the Montage studio, or `motionvideo catalog --search <term>`.
3. Check the session before relying on the CLI: `sh districts/creative/motionvideo/session-check.sh`. Exit 0 = signed in. Exit 1 = expired; ask the Instinct desk to re-login (needs an emailed code from the owner's Gmail, which only the desk can read).
4. Never copy a pack skill, font or starter file into a repo, a client deliverable folder that gets published, or a public bucket. Rendered videos you make are yours to ship.

## Boundaries

- No spend. The pack is already bought; nothing here calls a paid API.
- No timers or automation ship on. `session-check.sh` is run by hand or by the desk.
- Client-facing output follows the Creative district rules in `../CONTEXT.md`.
