#!/bin/sh
# Read-only: is the MotionVideo CLI signed in?
# Exit 0 signed in, 1 signed out or expired, 2 CLI missing, 3 check failed (timeout or other error).
export PATH="$HOME/.local/bin:$PATH"
mv_bin=$(command -v motionvideo 2>/dev/null) || { echo "motionvideo CLI not installed (see INSTALL.md)"; exit 2; }
if command -v timeout >/dev/null 2>&1; then run() { timeout 20 "$mv_bin" "$@"; }; else run() { "$mv_bin" "$@"; }; fi
out=$(run whoami 2>&1); rc=$?
if [ "$rc" -eq 0 ]; then echo "ok: $out"; exit 0; fi
if [ "$rc" -eq 124 ] || [ "$rc" -eq 126 ] || [ "$rc" -eq 127 ]; then echo "check failed (rc=$rc, timeout or CLI not runnable): $out"; exit 3; fi
case "$out" in
  *[Ss]ign*in*|*[Ll]ogin*|*[Ee]xpired*|*[Uu]nauthor*|*[Nn]ot\ logged*|*[Ss]igned\ out*) echo "signed out or expired: $out"; exit 1 ;;
  *) echo "check failed (rc=$rc, not clearly a sign-out): $out"; exit 3 ;;
esac
