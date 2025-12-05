#!/bin/bash

# Setup script to install git hooks
# This symlinks the version-controlled hooks to .git/hooks

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
HOOKS_DIR="$PROJECT_ROOT/scripts/git-hooks"
GIT_HOOKS_DIR="$PROJECT_ROOT/.git/hooks"

echo "🔧 Setting up git hooks..."

# Ensure .git/hooks directory exists
mkdir -p "$GIT_HOOKS_DIR"

# Install pre-commit hook
if [ -f "$HOOKS_DIR/pre-commit" ]; then
  ln -sf "../../scripts/git-hooks/pre-commit" "$GIT_HOOKS_DIR/pre-commit"
  chmod +x "$GIT_HOOKS_DIR/pre-commit"
  echo "✅ Installed pre-commit hook"
else
  echo "❌ Error: pre-commit hook not found at $HOOKS_DIR/pre-commit"
  exit 1
fi

echo "✨ Git hooks setup complete!"
echo ""
echo "The pre-commit hook will now prevent direct commits to main/master branches."

