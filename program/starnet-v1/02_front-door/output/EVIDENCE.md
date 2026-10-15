---
stage: 02_front-door
status: done
built_by: claude-session-01UT634v
verified_by: ""
commit: executiveusa/instinct-voice-agent@be1795d
proof:
  - https://github.com/executiveusa/instinct-voice-agent/pull/2
blocker: ""
---
Settings the server needs: TERABITHIA_URL, INSTINCT_TERABITHIA_TOKEN (in LiveKit secrets).

$ python3 -m pytest tests/ -q
13 passed in 0.04s
$ (hands.py reverted) python3 -m pytest tests/test_hands.py -q
3 failed, 4 passed in 0.03s
