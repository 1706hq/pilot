# Working together on PILOT (Craig + Connor)

The golden rule: **never edit directly on `main`.** Each person works on their own
branch, then merges. This way you can both work at the same time and Git keeps
your changes separate instead of one of you overwriting the other.

## One-time setup (each person, on their own machine)

```bash
git clone https://github.com/1706hq/pilot.git
cd pilot
npm install
source "$HOME/.cargo/env"   # if Rust was just installed
```

Then create your `.env.local` (see `context/setup.md`) — it is gitignored and
never shared through Git, so each machine needs its own copy.

## The everyday loop

**1. Start from the latest main:**
```bash
git checkout main
git pull
```

**2. Make a branch for what you're about to do** (name it after the work):
```bash
git checkout -b connor/voice-tweaks      # Connor
git checkout -b craig/canvas-fix         # Craig
```

**3. Edit, then save your work in small commits:**
```bash
git add -A
git commit -m "short description of what changed"
```

**4. Push your branch up:**
```bash
git push -u origin connor/voice-tweaks
```

**5. Merge it into main** — easiest is on GitHub: open the repo, click
**"Compare & pull request"**, then **"Merge pull request"**. Or from the terminal:
```bash
git checkout main
git pull
git merge connor/voice-tweaks
git push
```

**6. Delete the finished branch and start the next one fresh from step 1.**

## How to avoid clashes

- **Pull `main` before starting** anything (step 1). Always.
- **Try not to edit the same file at the same time.** Agree on who's working
  where — e.g. Connor on voice, Craig on the canvas.
- **Commit and push often.** Small, frequent pushes are far easier to merge than
  one giant change at the end of the day.
- **If Git says "merge conflict":** it means you both changed the same lines.
  Don't panic — open the file, you'll see both versions marked with
  `<<<<<<<`, `=======`, `>>>>>>>`. Keep the lines you want, delete the markers,
  then `git add` the file and `git commit`. Ask Claude Code if unsure.

## Quick reference

| I want to…                         | Command                                  |
|------------------------------------|------------------------------------------|
| See what I've changed              | `git status`                             |
| Get everyone's latest work         | `git checkout main && git pull`          |
| Start new work                     | `git checkout -b yourname/thing`         |
| Save my work                       | `git add -A && git commit -m "..."`      |
| Share my work                      | `git push -u origin yourname/thing`      |
| Undo uncommitted changes to a file | `git checkout -- path/to/file`           |
