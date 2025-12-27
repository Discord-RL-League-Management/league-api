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
    *   **Object Spread Conflicts:** Block object literals where multiple conditional spread operators assign to the same property key. This indicates conflicting optional parameters where one should take precedence. Pattern: `{ ...(condition1 && { key: value1 }), ...(condition2 && { key: value2 }) }` - the second spread overwrites the first.
    *   **Resource Cleanup Anti-Patterns:** Block try/catch blocks that contain duplicated cleanup code (e.g., `job.stop()`, `map.delete()`, `registry.delete()`) without a `finally` block. Cleanup code must be in `finally` to guarantee execution. Pattern: If cleanup code appears in both `try` and `catch` blocks, it must be moved to `finally`.
    *   **Control Flow Errors:** Detect operations called in wrong sequence (e.g., calling `close()` before `save()`, or processing after termination). Flag method calls that should follow a specific order based on their semantics.
    *   **State Management Bugs:** Detect invalid state transitions and state modifications after terminal states (e.g., modifying properties after status changes to `COMPLETED`, `CANCELLED`, or `FAILED`). Block operations that violate state machine invariants.
    *   **Initialization Bugs:** Detect variables used before initialization, uninitialized variables passed to functions, or data flow anomalies where variables are set but never used before being reassigned.
    *   **Parameter Conflicts:** Detect optional parameters that semantically conflict when both are provided (e.g., both `status?: T` and `includeCompleted?: boolean` modify the same query filter). Flag methods where conditional logic might cause parameter conflicts.
    *   **Boundary Condition Errors:** Detect off-by-one errors in loops (e.g., `<= array.length` instead of `< array.length`), wrong comparison operators (`<=` vs `<`, `==` vs `===`), or incorrect boundary handling in range checks.
    *   **Logical Operator Errors:** Detect incorrect use of logical operators (`&&` vs `||`, missing negations, double negations that cancel out), or conditions that can never be true/false due to logical flaws.
    *   **Interface Contract Violations:** Detect missing required fields in return values, wrong return types, or objects that don't satisfy interface contracts. Flag methods that return incomplete data structures.

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

**IV. Semantic Analysis Rules (AI-Enhanced Detection)**
Perform semantic analysis to detect logic errors that are syntactically valid but logically incorrect:

1.  **Object Spread Precedence Analysis:**
    *   Scan for object literals with multiple conditional spreads that assign to the same property.
    *   Example violation: `{ ...(options?.status && { status: options.status }), ...(options?.includeCompleted === false && { status: { not: 'COMPLETED' } }) }`
    *   **Fix:** Use explicit conditional logic: `if (options?.status) { where.status = options.status; } else if (options?.includeCompleted === false) { ... }`
    *   **Rationale:** Explicit parameters should take precedence over derived/computed filters.

2.  **Resource Lifecycle Management:**
    *   Detect patterns where resources are created (CronJob, Timer, FileHandle, DatabaseConnection, Map entries, Registry entries) and require cleanup.
    *   Identify cleanup methods: `.stop()`, `.close()`, `.delete()`, `.disconnect()`, `.clear()`, `Map.delete()`, `Set.delete()`.
    *   **Pattern Detection:** If cleanup code appears in both `try` and `catch` blocks, it must be in `finally`.
    *   **Pattern Detection:** If a resource is created in a try block and has a cleanup method, verify cleanup is in `finally`.
    *   **Exception:** Cleanup in `onApplicationShutdown` or `onModuleDestroy` hooks is acceptable as these are guaranteed to run.

3.  **Control Flow Sequence Analysis:**
    *   Detect operations that must follow a specific sequence based on their semantics (e.g., `save()` before `close()`, `connect()` before `query()`, `validate()` before `process()`).
    *   Flag method calls that appear out of order based on common patterns and naming conventions.
    *   **Fix:** Reorder operations to follow correct sequence or add explicit sequencing logic.

4.  **State Management Pattern Detection:**
    *   Detect state machines and identify terminal states (e.g., `COMPLETED`, `CANCELLED`, `FAILED`, `DELETED`).
    *   Flag property modifications after state transitions to terminal states.
    *   Detect invalid state transitions (e.g., transitioning from `CANCELLED` to `PENDING`).
    *   **Fix:** Prevent modifications after terminal states or add state validation logic.

5.  **Parameter Conflict Detection:**
    *   For methods with multiple optional parameters that affect the same behavior, verify explicit parameters take precedence.
    *   Flag methods where conditional logic might cause parameter conflicts.
    *   **Fix:** Suggest explicit precedence rules (if/else chains) over spread operator conflicts.

6.  **Boundary Condition Analysis:**
    *   Detect loop boundary errors: `for (let i = 0; i <= array.length; i++)` should be `< array.length`.
    *   Detect comparison operator errors: `if (value < threshold)` when it should be `<= threshold` or vice versa.
    *   Flag boundary checks that don't account for edge cases (empty arrays, null values, zero/negative numbers).
    *   **Fix:** Correct boundary conditions and comparison operators.

7.  **Data Flow Analysis:**
    *   Detect variables used before initialization.
    *   Detect uninitialized variables passed to functions.
    *   Flag variables that are set but never used before being reassigned (dead assignments).
    *   **Fix:** Ensure proper initialization before use.

8.  **Logical Operator Analysis:**
    *   Detect incorrect use of `&&` when `||` is intended (or vice versa).
    *   Detect missing negations: `if (!condition)` when it should be `if (condition)`.
    *   Detect conditions that can never be true/false due to logical flaws.
    *   **Fix:** Correct logical operators and conditions.

9.  **Interface Contract Validation:**
    *   For methods that return objects, verify all required fields from the return type are present.
    *   Detect return statements that don't match the declared return type structure.
    *   Flag objects missing required properties based on TypeScript interfaces or JSDoc contracts.
    *   **Fix:** Ensure return values satisfy interface contracts.
