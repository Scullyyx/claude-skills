#!/usr/bin/env bash
# Link every skill in this repo into ~/.claude/skills.
set -euo pipefail
repo_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
mkdir -p "$HOME/.claude/skills"
for d in "$repo_dir"/skills/*/; do
  name="$(basename "$d")"
  ln -sfn "${d%/}" "$HOME/.claude/skills/$name"
  echo "linked $name"
done
