# Git Hooks

This directory contains git hooks that are version controlled and automatically installed.

## Pre-commit Hook

The `pre-commit` hook performs several checks before allowing a commit:

1. **Branch Protection**: Prevents direct commits to the `main` or `master` branch
2. **Linter**: Runs `npm run lint` to check code quality (includes ESLint complexity rule with max: 30)
3. **Tests**: Runs `npm test` to ensure all tests pass

### How it works

- When you try to commit, the hook runs in this order:
  1. Checks if you're on `main` or `master` (blocks if so)
  2. Runs the linter (blocks if linting errors found, including complexity >= 30)
  3. Runs the test suite (blocks if tests fail)
- If any check fails, the commit is blocked
- You'll see clear error messages indicating what failed

### Complexity Check

Cyclomatic complexity checking is built into ESLint via the `complexity` rule:
- **Blocks commits** if any function has cyclomatic complexity >= 30 (high-risk threshold)
- Configured in `eslint.config.mjs`
- Automatically runs as part of `npm run lint`

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

If you need to bypass the pre-commit checks (e.g., for a hotfix), you can use:

```bash
git commit --no-verify -m "fix: emergency hotfix"
```

⚠️ **Warning**: Only use `--no-verify` when absolutely necessary. Prefer creating a branch and using a pull request workflow.

## Commit-msg Hook

The `commit-msg` hook validates that commit messages follow the [Conventional Commits](https://www.conventionalcommits.org/) specification using [commitlint](https://commitlint.js.org/).

### How it works

- Uses `@commitlint/config-conventional` to validate commit messages
- Validates commit message format: `<type>[optional scope]: <description>`
- Enforces maximum header length of 72 characters
- Provides helpful error messages with examples if validation fails

### Valid Commit Types

- `feat` - A new feature
- `fix` - A bug fix
- `docs` - Documentation only changes
- `style` - Code style changes (formatting, missing semi colons, etc)
- `refactor` - Code refactoring without feature changes or bug fixes
- `perf` - Performance improvements
- `test` - Adding or updating tests
- `chore` - Maintenance tasks, dependency updates, etc.
- `build` - Changes to build system or dependencies
- `ci` - Changes to CI configuration
- `revert` - Reverts a previous commit

### Examples

✅ Valid commit messages:
```
feat(auth): add JWT token validation
fix(api): resolve null pointer exception
docs: update README with setup instructions
chore: update dependencies
feat!: breaking change description
```

❌ Invalid commit messages:
```
Added new feature
fix bug
update readme
```

### Bypassing (when necessary)

If you need to bypass the commit message validation:

```bash
git commit --no-verify -m "your message"
```

⚠️ **Warning**: Only use `--no-verify` when absolutely necessary. Conventional commits enable automated versioning and changelog generation.

## Post-merge Hook

The `post-merge` hook automatically formats files that were changed during a merge operation. This prevents formatting drift when merging feature branches that may have been created before formatting rules were enforced or that bypassed pre-commit hooks.

### How it works

- After a merge completes, the hook:
  1. Identifies files that were changed in the merge
  2. Filters to TypeScript/JavaScript/JSON/Markdown files
  3. Runs Prettier to format those files
  4. Reports which files were reformatted
  5. Does **not** auto-stage files (you can review with `git diff`)

### Why it's needed

- **Merge commits don't trigger pre-commit hooks** (by design)
- Feature branches may have files without trailing newlines or other formatting issues
- Without this hook, formatting issues accumulate on `main` after merges
- This ensures `main` stays consistently formatted

### Behavior

- **Non-blocking**: If formatting fails, the merge still succeeds (you'll get a warning)
- **Selective**: Only formats files that were actually changed in the merge
- **Transparent**: Shows you which files were reformatted
- **Safe**: Doesn't auto-stage changes, so you can review them first

### Example Output

```
🔄 Post-merge: Formatting files changed in merge...
📝 Formatting 5 file(s) with Prettier...
✅ Successfully formatted 5 file(s)

📋 3 file(s) were reformatted:
   - src/common/interfaces/league-domain/league-member-access.interface.ts
   - tests/factories/user.factory.ts
   - tests/setup/e2e-setup.ts

💡 Tip: Review the changes with 'git diff' and commit if desired
```

### Bypassing (when necessary)

Post-merge hooks cannot be bypassed with `--no-verify` (they run after the merge). If you need to skip formatting:

1. Temporarily rename the hook: `mv .git/hooks/post-merge .git/hooks/post-merge.bak`
2. Perform your merge
3. Restore the hook: `mv .git/hooks/post-merge.bak .git/hooks/post-merge`

⚠️ **Note**: This is rarely necessary. The hook is designed to be safe and non-intrusive.

