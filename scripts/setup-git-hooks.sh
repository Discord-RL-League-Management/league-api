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

# Install commit-msg hook
if [ -f "$HOOKS_DIR/commit-msg" ]; then
  ln -sf "../../scripts/git-hooks/commit-msg" "$GIT_HOOKS_DIR/commit-msg"
  chmod +x "$GIT_HOOKS_DIR/commit-msg"
  echo "✅ Installed commit-msg hook"
else
  echo "❌ Error: commit-msg hook not found at $HOOKS_DIR/commit-msg"
  exit 1
fi

# Install post-merge hook
if [ -f "$HOOKS_DIR/post-merge" ]; then
  ln -sf "../../scripts/git-hooks/post-merge" "$GIT_HOOKS_DIR/post-merge"
  chmod +x "$GIT_HOOKS_DIR/post-merge"
  echo "✅ Installed post-merge hook"
else
  echo "❌ Error: post-merge hook not found at $HOOKS_DIR/post-merge"
  exit 1
fi

echo "✨ Git hooks setup complete!"
echo ""
echo "Installed hooks:"
echo "  • pre-commit: Prevents direct commits to main/master, runs linter and tests"
echo "  • commit-msg: Validates conventional commit message format"
echo "  • post-merge: Automatically formats files changed in merges"

