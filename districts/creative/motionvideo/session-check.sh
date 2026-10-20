#!/bin/sh
# Read-only: is the MotionVideo CLI signed in? Exit 0 yes, 1 no, 2 CLI missing.
export PATH="$HOME/.local/bin:$PATH"
command -v motionvideo >/dev/null 2>&1 || { echo "motionvideo CLI not installed (see INSTALL.md)"; exit 2; }
if out=$(motionvideo whoami 2>&1); then echo "ok: $out"; exit 0; fi
echo "signed out or expired: $out"; exit 1
