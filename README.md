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
| `ask-matt` | [mattpocock/skills](https://github.com/mattpocock/skills) |
| `code-review` | [mattpocock/skills](https://github.com/mattpocock/skills) |
| `codebase-design` | [mattpocock/skills](https://github.com/mattpocock/skills) |
| `diagnosing-bugs` | [mattpocock/skills](https://github.com/mattpocock/skills) |
| `domain-modeling` | [mattpocock/skills](https://github.com/mattpocock/skills) |
| `grill-with-docs` | [mattpocock/skills](https://github.com/mattpocock/skills) |
| `grilling` | [mattpocock/skills](https://github.com/mattpocock/skills) |
| `implement` | [mattpocock/skills](https://github.com/mattpocock/skills) |
| `implement-spec` | [mattpocock/skills](https://github.com/mattpocock/skills) |
| `improve-codebase-architecture` | [mattpocock/skills](https://github.com/mattpocock/skills) |
| `pr` | [mattpocock/skills](https://github.com/mattpocock/skills) |
| `prototype` | [mattpocock/skills](https://github.com/mattpocock/skills) |
| `research` | [mattpocock/skills](https://github.com/mattpocock/skills) |
| `retro` | [mattpocock/skills](https://github.com/mattpocock/skills) |
| `setup-matt-pocock-skills` | [mattpocock/skills](https://github.com/mattpocock/skills) |
| `tdd` | [mattpocock/skills](https://github.com/mattpocock/skills) |
| `to-spec` | [mattpocock/skills](https://github.com/mattpocock/skills) |
| `to-tickets` | [mattpocock/skills](https://github.com/mattpocock/skills) |
| `triage` | [mattpocock/skills](https://github.com/mattpocock/skills) |
| `wayfinder` | [mattpocock/skills](https://github.com/mattpocock/skills) |
| `wizard` | [mattpocock/skills](https://github.com/mattpocock/skills) |
| `thermo-nuclear-code-quality-review` | [cursor/plugins](https://github.com/cursor/plugins/tree/main/thermos) |

The mattpocock skills are copied from commit `49dd158d1076134a641b33efb035946536778336` and are MIT licensed; see [`third_party/mattpocock-skills/LICENSE`](third_party/mattpocock-skills/LICENSE).

The Cursor skill is copied from commit `ccb5507cec1546dc88135c1139c811e6c59115ba` and is MIT licensed; see [`third_party/cursor-plugins/LICENSE`](third_party/cursor-plugins/LICENSE).
