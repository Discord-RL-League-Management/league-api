/debt marker check

**Objective:** Execute a rapid, differential scan against the staged changes (`git diff --cached`) to locate and manage common technical debt markers. The primary goal is to enforce the immediate resolution or removal of these markers before they are committed to the repository.

**I. Configuration and Scope**
1.  **Scope:** Analyze **only** the newly added or modified lines within the currently staged changes (`git diff --cached`).
2.  **Target Markers (The Debt Taxonomy):** Scan for and categorize the following specific markers, which indicate delayed work or necessary, but temporary, code decisions:
    *   `TODO`
    *   `FIXME`
    *   `HACK`
    *   `WORKAROUND`
    *   `OPTIMIZE`
    *   `BUG`
    *   `XXX`
3.  **Output:** If markers are found, generate an immediate, concise **Debt Marker Register** listing the file name, line number, and the exact content of the comment.

**II. Enforcement Policy and Action Mandate**

The policy enforces a zero-tolerance approach to these markers entering the codebase, focusing on *resolution* rather than merely rejection.

1.  **Hard Block Policy:** If any target marker is detected, the command must execute a **hard block** (reject the commit). The developer must choose one of two paths for resolution:
    *   **Path A: Manual Removal/Resolution:** The developer manually resolves the underlying issue or removes the marker entirely.
    *   **Path B: Automated Remediation (LLM Quick Fix):** If the marker describes a trivial structural issue (e.g., simple refactoring or optimization), the AI should propose an immediate fix.
2.  **LLM Remediation Loop:** For Automated Remediation (Path B), implement a critical verification loop:
    *   **Generate Fix:** Use the context around the marker to generate a structured, behavior-preserving code fix that resolves the debt described by the comment (e.g., replacing `//HACK: temporary bypass` with the corrected logic or refactoring a `TODO: extract method`).
    *   **Verification:** The generated fix must be applied to the local codebase, and relevant **targeted unit tests** must be executed immediately. The fix is considered valid and the marker is allowed to be removed *only if* all targeted tests pass.

**III. Final Output Requirement**
If the command blocks the commit, the final output must provide the Debt Marker Register and prompt the user for immediate action: either manual removal or initiation of the LLM-driven quick fix loop.
