# Debt Marker Check System

## Overview

The Debt Marker Check system enforces a **zero-tolerance policy** for technical debt markers in committed code. It automatically scans staged git changes and blocks commits containing any of the following markers:

- `TODO`
- `FIXME`
- `HACK`
- `WORKAROUND`
- `OPTIMIZE`
- `BUG`
- `XXX`

## How It Works

### 1. Pre-Commit Hook

A git pre-commit hook automatically runs the debt marker check before every commit. If any markers are found, the commit is **blocked** and a Debt Marker Register is displayed.

### 2. Manual Check

You can manually check for debt markers at any time:

```bash
npm run debt:check
```

### 3. Automated Remediation

If markers are found, you have two options:

#### Option A: Manual Resolution
- Remove the marker and resolve the underlying issue
- Or remove the marker if the issue is already resolved
- Stage your changes and commit again

#### Option B: Automated LLM Remediation
```bash
npm run debt:fix
```

**Note:** The automated fix feature requires LLM API integration. Currently, it provides the structure and prompts but needs implementation of the actual LLM API call (OpenAI, Anthropic, etc.).

## Features

### Differential Scanning
- Only scans **newly added or modified lines** in staged changes
- Ignores existing code and test files
- Efficient and focused on preventing new debt

### Debt Marker Register
When markers are found, a detailed register is generated showing:
- File name
- Line number
- Marker type
- Exact content

### Test Verification
The automated fix system:
1. Generates a fix based on the marker context
2. Applies the fix to the codebase
3. Runs relevant unit tests
4. Only accepts the fix if all tests pass
5. Reverts the fix if tests fail

## Configuration

### Target Markers
The system scans for these markers (case-insensitive):
- `TODO`
- `FIXME`
- `HACK`
- `WORKAROUND`
- `OPTIMIZE`
- `BUG`
- `XXX`

### File Filtering
- Scans: `.ts`, `.js`, `.tsx`, `.jsx` files
- Excludes: `.spec.ts`, `.test.ts` files (test files are not scanned)

## Implementation Details

### Files Created
- `scripts/debt-marker-check.ts` - Main scanner script
- `scripts/debt-marker-fix.ts` - Automated remediation script
- `.git/hooks/pre-commit` - Git pre-commit hook
- `.debt-markers.json` - Temporary file storing found markers (gitignored)

### NPM Scripts
- `npm run debt:check` - Manual check for debt markers
- `npm run debt:fix` - Automated remediation (requires LLM integration)

## LLM Integration

To enable automated fixes, you need to implement the `generateFix()` function in `scripts/debt-marker-fix.ts`. The function should:

1. Accept a `DebtMarker` object
2. Use the generated prompt (via `generateFixPrompt()`)
3. Call your LLM API (OpenAI, Anthropic, etc.)
4. Return the fixed code content

Example structure:
```typescript
async function generateFix(marker: DebtMarker): Promise<{ success: boolean; newContent?: string; explanation?: string }> {
  const prompt = generateFixPrompt(marker);
  // TODO: Implement LLM API call
  // const response = await callLLMAPI(prompt);
  // return { success: true, newContent: response.fixedCode };
}
```

## Bypassing the Check

**Not recommended**, but if you absolutely must bypass (e.g., for emergency hotfixes):

```bash
git commit --no-verify
```

**Warning:** This should only be used in exceptional circumstances and the debt should be addressed immediately after.

## Troubleshooting

### Hook Not Running
- Ensure the hook is executable: `chmod +x .git/hooks/pre-commit`
- Verify git hooks are enabled: `git config core.hooksPath` (should be empty or point to `.git/hooks`)

### Script Errors
- Ensure dependencies are installed: `npm install`
- Check Node.js version: `node --version` (requires >= 24.0.0)
- Verify TypeScript compilation: `npx tsc --noEmit scripts/debt-marker-check.ts`

### False Positives
If legitimate code contains these marker words (e.g., in strings or comments that aren't debt markers), you can:
1. Refactor to avoid the marker word
2. Use a different word/phrase
3. Temporarily bypass with `--no-verify` (not recommended)

## Best Practices

1. **Resolve Immediately**: Don't leave debt markers in code. Either fix the issue or remove the marker.
2. **Use Descriptive Comments**: If you must leave a marker temporarily, make it very descriptive so future fixes are easier.
3. **Regular Cleanup**: Periodically scan the entire codebase for debt markers: `git grep -i "TODO\|FIXME\|HACK"`

## Example Output

```
╔══════════════════════════════════════════════════════════════╗
║           DEBT MARKER REGISTER - COMMIT BLOCKED           ║
╚══════════════════════════════════════════════════════════════╝

Found 2 technical debt marker(s) in staged changes:

📄 src/services/user.service.ts
────────────────────────────────────────────────────────────
  Line 45 [TODO]:
    // TODO: Refactor this method to use repository pattern

  Line 78 [FIXME]:
    // FIXME: Handle edge case when user is null

╔══════════════════════════════════════════════════════════════╗
║                    RESOLUTION OPTIONS                         ║
╚══════════════════════════════════════════════════════════════╝

You must resolve all debt markers before committing.

Option A: Manual Resolution
  • Remove the marker and resolve the underlying issue
  • Or remove the marker if the issue is already resolved
  • Stage your changes and try committing again

Option B: Automated LLM Remediation
  • Run: npm run debt:fix
  • The AI will attempt to fix trivial issues automatically
  • Fixes will be verified with unit tests before applying
```

