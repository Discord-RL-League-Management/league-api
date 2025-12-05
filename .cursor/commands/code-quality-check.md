/code quality check

**Objective:** Perform a rapid, differential (diff-only) static analysis on the currently uncommitted code to identify and enforce immediate blocks against critical bugs, high-risk security vulnerabilities, and excessive maintainability debt introduced in the current patch.

**I. Criticality and Performance Constraints**
1.  **Scope:** Analyze **only** the uncommitted code changes (the `git diff`). Do not perform a full repository scan.
2.  **Performance Mandate:** The analysis must be optimized for speed (sub-second latency is preferred) and use incremental analysis techniques, such as cache reuse, to prevent workflow friction.
3.  **Enforcement Policy:** Any issue categorized as "Blocker" or "Critical" must result in a hard block with actionable, immediate feedback.

**II. Detection and Quantitative Thresholds**
For all modified files, execute static analysis focusing on:

1.  **Critical Bugs (Hard Block):** Detect and block common runtime errors and logic flaws.
    *   Null Pointer Dereferences.
    *   Unreachable or Dead Code.
    *   Concurrency Issues or Unhandled/Misused Promises (e.g., returning promises where a value is expected).

2.  **Security Vulnerabilities (Hard Block):** Scan for high-risk security flaws.
    *   Hardcoded Secrets (e.g., API keys, passwords).
    *   SQL/XSS Injection vectors in new input handling.
    *   **CVSS Threshold:** Block if the new code introduces a vulnerability with a **CVSS Base Score of High or Critical ($\geq 7.0$)**.

3.  **Maintainability Debt (Complexity Block):** Quantify structural decay using industry-standard metrics.
    *   **Cyclomatic Complexity (CC):** Block new functions if their CC score exceeds the high-risk threshold (e.g., **CC > 30**).
    *   **Maintainability Index (MI):** Flag and warn if the change results in a significant drop in the file’s Maintainability Index score.

**III. Actionability and Automated Remediation**
1.  **Feedback Format:** Provide specific, actionable feedback listing the file, line number, issue description, and a direct suggestion for remediation.
2.  **Quick Fix Mandate (LLM Integration):** For lower-severity issues classified as Code Smells (e.g., Long Methods, Magic Numbers, Data Clumps):
    *   Generate a structural fix (e.g., **Extract Method** or **Replace Magic Number with Constant**).
    *   **Verification Loop:** The suggested fix must be applied, followed immediately by running targeted unit tests. The fix is only successful and applied if all targeted tests pass.
