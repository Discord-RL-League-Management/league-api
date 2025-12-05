# Git Hooks

This directory contains git hooks that are version controlled and automatically installed.

## Pre-commit Hook

The `pre-commit` hook prevents direct commits to the `main` or `master` branch. This protects the main branch from accidental direct commits.

### How it works

- When you try to commit on `main` or `master`, the hook will block the commit
- You'll be prompted to create a feature branch instead
- If you really need to commit to main (e.g., hotfix), you can bypass with `git commit --no-verify`

### Setup

The hooks are automatically installed when you run:

```bash
npm run setup:hooks
```

Or manually:

```bash
bash scripts/setup-git-hooks.sh
```

### Bypassing (when necessary)

If you need to commit directly to main (e.g., for a hotfix), you can bypass the hook:

```bash
git commit --no-verify -m "fix: emergency hotfix"
```

⚠️ **Warning**: Only use `--no-verify` when absolutely necessary. Prefer creating a branch and using a pull request workflow.

