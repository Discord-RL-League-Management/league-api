# SOC Refactoring Epic - Issues

This directory contains issue templates for the **Separation of Concerns Improvements** epic.

## Current Epic

**Branch**: `54-api-endpoints-for-scheduled-processing`  
**Epic Name**: Separation of Concerns Improvements

## Issues to Create

### 1. SOC-001: Break Circular Dependencies
- **File**: `SOC-001-circular-dependencies.md`
- **Priority**: P2 (High)
- **Estimated Effort**: 10 hours
- **Status**: Not Started

### 2. SOC-002: Reduce GuildsModule Dependencies
- **File**: `SOC-002-guilds-module-dependencies.md`
- **Priority**: P2 (High)
- **Estimated Effort**: 6 hours
- **Status**: Not Started

## How to Create GitHub Issues

### Option 1: Using GitHub CLI (gh)

```bash
# Create issue 1: Circular Dependencies
gh issue create \
  --title "Break Circular Dependencies (SOC)" \
  --body-file .github/ISSUES/SOC-001-circular-dependencies.md \
  --label "refactoring,architecture,high-priority" \
  --milestone "SOC-Refactoring"

# Create issue 2: GuildsModule Dependencies
gh issue create \
  --title "Reduce GuildsModule Dependencies (SOC)" \
  --body-file .github/ISSUES/SOC-002-guilds-module-dependencies.md \
  --label "refactoring,architecture,high-priority" \
  --milestone "SOC-Refactoring"
```

### Option 2: Using GitHub Web Interface

1. Go to the repository's Issues page
2. Click "New Issue"
3. Copy the contents from the markdown file (excluding the frontmatter)
4. Paste into the issue description
5. Add the labels: `refactoring`, `architecture`, `high-priority`
6. Add to the appropriate milestone/epic
7. Submit the issue

### Option 3: Copy-Paste Format

The markdown files contain GitHub issue markdown format. You can copy the content directly into GitHub's issue creation form.

## Epic Summary

| Issue | Status | Priority | Effort |
|-------|--------|----------|--------|
| TrackerService DHI Reduction | ✅ Complete | P1 | 12h |
| AuthController LCOM Reduction | ✅ Complete | P2 | 7h |
| GuildsController Duplication | ✅ Complete | P3 | 4h |
| **SOC-001: Circular Dependencies** | 🔴 **Pending** | **P2** | **10h** |
| **SOC-002: GuildsModule Dependencies** | 🔴 **Pending** | **P2** | **6h** |

**Total Completed**: 23 hours  
**Total Remaining**: 16 hours  
**Progress**: ~60% complete

## Related Documentation

- `docs/SOC_BIGGEST_GAPS.md` - Complete SOC analysis
- `docs/SOC_COMPREHENSIVE_ANALYSIS.md` - Detailed analysis
- `docs/SOC_ISSUES.md` - Issue tracking document
- `docs/SOC_METRICS_TRACKING.md` - Metrics and targets


