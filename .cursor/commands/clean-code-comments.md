/clean-code-comments

**Objective:** Systematically analyze the entire codebase for comments that constitute "comment rot" (unnecessary, obsolete, or redundant text) and generate a safe, validated, minimal-diff patch for removal or correction.

**I. Phase 1: Mandatory Exclusion & Static Classification (Deterministic Rules)**

The highest priority is safety. Use deterministic static analysis to absolutely preserve and exclude the following, regardless of content:

1.  **Exclusions (Preserve):**
    *   **Legal/Licensing Headers:** Protect copyright blocks and license identifiers found at the top of files (e.g., matching common Regex patterns for "Copyright" or "LICENSE").
    *   **Documentation Strings:** Preserve all formal Docstrings (Python), Javadoc, JSDoc, and similar API documentation blocks.
    *   **Tool Annotations:** Protect comments or tags that are actively parsed by external tools (e.g., lint suppression tags, generated code markers like `@generated` or `DO NOT EDIT`).

2.  **High-Confidence Removal Targets:** Automatically flag for removal:
    *   **Chronicle/Historical Comments:** Obsolete change logs, author notes, or modification history that is duplicated by version control (Git).
    *   **Commented-Out Code:** Blocks of code that are currently disabled.

**II. Phase 2: Contextual Semantic Analysis (LLM-Assisted)**

For all non-excluded line and block comments, leverage contextual reasoning to make a three-way decision:

1.  **Remove (Redundancy):** If the comment is redundant or merely restates the obvious *what* (the visible code operation, function name, or simple variable assignment), it must be removed. The code should be self-documenting.
2.  **Rewrite (Intent Correction):** If the comment documents non-obvious *why* (e.g., a defensive warning, bug fix context, or necessary constraint) but is outdated or poorly phrased, rewrite it to be clear and accurate, ensuring the original developer intent is preserved.
3.  **Stale Marker Resolution:** Flag and propose removal for any Lingering Task Markers (`TODO`, `FIXME`, `HACK`) if they appear to be stale or relate to resolved issues.

**III. Phase 3: Output and Verification (The Safety Net)**

1.  **Surgical Edits:** Generate the proposed changes as a **minimal-diff patch**. Strictly adhere to a "least change possible" approach; do not modify formatting, unrelated code, or extraneous whitespace outside of the required comment adjustment or removal.
2.  **Verification Loop:** For every proposed modification, automatically execute the **targeted unit and integration test suite** against the modified code. The cleanup is only allowed to proceed and the changes can only be staged if **all tests pass**, confirming absolute preservation of external behavior.
3.  **Final Output:** Present the final output as the verified, ready-to-commit code patch (diff) or a list of files that were successfully cleaned.