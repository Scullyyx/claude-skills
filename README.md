# claude-skills

Personal Claude Code skills. Each folder in `skills/` is one skill (a `SKILL.md` plus supporting files).

## Install

```bash
git clone https://github.com/Scullyyx/claude-skills.git ~/src/claude-skills
~/src/claude-skills/install.sh
```

`install.sh` symlinks every skill into `~/.claude/skills/`, so a `git pull` updates them in place.
Re-run it after adding a new skill.

### Claude Code cloud sessions

Add the two install lines above to the environment's setup script so each new session loads the skills at startup.
The environment needs GitHub access to this repo, since it is private.

## Skills

| Skill | Source |
|---|---|
| `codebase-design` | [mattpocock/skills](https://github.com/mattpocock/skills) |
| `domain-modeling` | [mattpocock/skills](https://github.com/mattpocock/skills) |
| `grilling` | [mattpocock/skills](https://github.com/mattpocock/skills) |
| `improve-codebase-architecture` | [mattpocock/skills](https://github.com/mattpocock/skills) |
| `thermo-nuclear-code-quality-review` | [cursor/plugins](https://github.com/cursor/plugins/tree/main/thermos) |

The mattpocock skills are copied from commit `b0618bc436ad893b3c5e84e55fba86586d34a404` and are MIT licensed; see [`third_party/mattpocock-skills/LICENSE`](third_party/mattpocock-skills/LICENSE).

The Cursor skill is copied from commit `ccb5507cec1546dc88135c1139c811e6c59115ba` and is MIT licensed; see [`third_party/cursor-plugins/LICENSE`](third_party/cursor-plugins/LICENSE).
