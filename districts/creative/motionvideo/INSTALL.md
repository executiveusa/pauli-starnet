# Install the MotionVideo pack (user level, never in a repo)

Needs: the pack tarball from the owner's MotionVideo dashboard (he owns the licence), node 20+.

    tar xzf motionvideo-pack-install.tar.gz && cd motionvideo-pack && sh install.sh

Skills go to `~/.motionvideo/skills` and, when `~/.claude` exists, `~/.claude/skills`. CLI goes to `~/.local/bin/motionvideo`.

Sign in (7-day session): open https://motionvideo.xyz/sign-in in a browser, enter the owner's email, click Send code, then `motionvideo login --email <email> --code <6 digits>`. The code arrives in the owner's inbox.

Do not commit anything from the extracted folder.
