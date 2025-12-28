/semantic bug check

**Objective:** Perform deep semantic and logic bug detection on code changes or specified files/directories. This command complements `code-quality-check.md` by focusing on AI-enhanced pattern recognition and semantic analysis that goes beyond syntax-level checks. It detects logic errors that are syntactically valid but semantically incorrect.

**I. Criticality and Performance Constraints**

1.  **Scope:** Analyze uncommitted code changes (git diff) by default, with option to analyze specific files or directories for deeper analysis. When analyzing full codebase, prioritize changed files first.
2.  **Performance Mandate:** For diff-only analysis, target sub-30 second latency. For full codebase analysis, target completion within 2-5 minutes depending on codebase size. Use incremental analysis techniques and caching to prevent workflow friction.
3.  **Enforcement Policy:** Issues categorized as "Blocker" or "Critical" must result in a hard block with actionable, immediate feedback. Issues with "Medium" or "Low" confidence may be warnings that don't block but should be reviewed.

**II. Semantic Bug Detection Rules**

For all analyzed files, execute deep semantic analysis focusing on 9 critical bug categories:

1.  **Object Spread Conflicts & Parameter Precedence (Hard Block):**
    *   **Pattern Detection:** Identify object literals where multiple conditional spread operators assign to the same property key. This indicates conflicting optional parameters where one should take precedence.
    *   **AST Pattern:** Object literal with multiple `SpreadElement` nodes where each spread's object expression contains the same property key.
    *   **Example Violation:** `{ ...(options?.status && { status: options.status }), ...(options?.includeCompleted === false && { status: { not: 'COMPLETED' } }) }`
    *   **Detection Method:** 
        - Traverse AST for object literals
        - Identify all `SpreadElement` nodes with conditional expressions (`&&`, `||`, ternary)
        - Extract property keys from spread object expressions
        - Flag when same key appears in multiple conditional spreads
    *   **Fix:** Use explicit conditional logic with clear precedence: `if (options?.status) { where.status = options.status; } else if (options?.includeCompleted === false) { where.status = { not: 'COMPLETED' }; }`
    *   **Rationale:** Explicit parameters should take precedence over derived/computed filters. Spread operator order is not a reliable way to establish precedence.
    *   **False Positive Patterns:** 
        - Spreads that intentionally override (documented behavior)
        - Spreads with different property paths (e.g., `{ ...a, ...b }` where `a` and `b` have different keys)
        - Non-conditional spreads (simple object merging)

2.  **Resource Cleanup Anti-Patterns (Hard Block):**
    *   **Pattern Detection:** Identify try/catch blocks containing duplicated cleanup code without a `finally` block. Cleanup code must be in `finally` to guarantee execution regardless of success or failure.
    *   **AST Pattern:** `TryStatement` with `catch` block containing cleanup method calls, but no `finally` block, and cleanup methods also appear in `try` block.
    *   **Example Violation:** 
        ```typescript
        try {
          const job = this.scheduler.addCronJob(...);
          await job.start();
        } catch (error) {
          await job.stop(); // Cleanup in catch only
          throw error;
        }
        // Missing finally block
        ```
    *   **Detection Method:**
        - Identify `TryStatement` nodes
        - Check for cleanup method calls: `.stop()`, `.close()`, `.delete()`, `.disconnect()`, `.clear()`, `Map.delete()`, `Set.delete()`, `registry.delete()`
        - Verify if cleanup appears in both `try` and `catch` blocks
        - Flag if `finally` block is missing
        - Check if resource is created in `try` block and requires cleanup
    *   **Fix:** Move cleanup code to `finally` block:
        ```typescript
        try {
          const job = this.scheduler.addCronJob(...);
          await job.start();
        } catch (error) {
          throw error;
        } finally {
          await job.stop(); // Guaranteed execution
        }
        ```
    *   **Exception:** Cleanup in `onApplicationShutdown` or `onModuleDestroy` hooks is acceptable as these are guaranteed to run by the framework.
    *   **False Positive Patterns:**
        - Cleanup in framework lifecycle hooks
        - Resources that don't require cleanup (stateless services)
        - Cleanup that's intentionally conditional (documented behavior)

3.  **Control Flow Sequence Errors (Hard Block):**
    *   **Pattern Detection:** Detect operations called in wrong sequence based on their semantics. Common patterns include: `close()` before `save()`, `query()` before `connect()`, `process()` before `validate()`.
    *   **AST Pattern:** Method calls that violate semantic ordering rules within the same function or method chain.
    *   **Example Violation:** 
        ```typescript
        const connection = await db.connect();
        await connection.close(); // Close before use
        await connection.query('SELECT * FROM users');
        ```
    *   **Detection Method:**
        - Build call graph for function/method
        - Identify sequence-dependent method pairs:
          - `connect()` → `query()` → `close()`
          - `open()` → `read()`/`write()` → `close()`
          - `save()` → `close()`
          - `validate()` → `process()`
          - `start()` → `execute()` → `stop()`
        - Flag when dependent method called before prerequisite
        - Use naming conventions and method signatures to infer dependencies
    *   **Fix:** Reorder operations to follow correct sequence or add explicit sequencing validation:
        ```typescript
        const connection = await db.connect();
        await connection.query('SELECT * FROM users');
        await connection.close(); // Close after use
        ```
    *   **False Positive Patterns:**
        - Methods with different names that don't have sequence dependencies
        - Operations in different scopes (different functions, different objects)
        - Operations that are intentionally reordered (documented behavior)

4.  **State Management Violations (Hard Block):**
    *   **Pattern Detection:** Detect invalid state transitions and state modifications after terminal states. Terminal states include: `COMPLETED`, `CANCELLED`, `FAILED`, `DELETED`, `TERMINATED`.
    *   **AST Pattern:** Property assignments or method calls after state transitions to terminal states.
    *   **Example Violation:**
        ```typescript
        if (this.status === 'COMPLETED') {
          this.status = 'PENDING'; // Invalid transition from terminal state
          this.processData(); // Modification after terminal state
        }
        ```
    *   **Detection Method:**
        - Identify state machine patterns: enum/string properties named `status`, `state`, `phase`, `stage`
        - Detect terminal state values: `COMPLETED`, `CANCELLED`, `FAILED`, `DELETED`, `TERMINATED`, `DONE`, `FINISHED`
        - Track state transitions: assignments to state properties
        - Flag property modifications after terminal state assignment
        - Flag invalid state transitions (e.g., `CANCELLED` → `PENDING`)
    *   **Fix:** Add state validation guards or prevent modifications after terminal states:
        ```typescript
        if (this.status === 'COMPLETED') {
          throw new Error('Cannot modify completed entity');
        }
        this.status = 'PENDING';
        this.processData();
        ```
    *   **False Positive Patterns:**
        - State properties that aren't actually state machines (e.g., `userStatus` that's just a label)
        - Modifications that are allowed after terminal states (documented behavior)
        - State resets that are intentional (e.g., retry mechanisms)

5.  **Initialization & Data Flow Bugs (Hard Block):**
    *   **Pattern Detection:** Detect variables used before initialization, uninitialized variables passed to functions, or data flow anomalies where variables are set but never used before being reassigned.
    *   **AST Pattern:** Variable references before their declaration/initialization in the same scope, or variables assigned but not read before reassignment.
    *   **Example Violation:**
        ```typescript
        function processData() {
          console.log(data); // Used before initialization
          const data = fetchData();
          
          let result = computeResult(data);
          result = transformResult(result); // First assignment never used
        }
        ```
    *   **Detection Method:**
        - Perform data flow analysis (def-use chains)
        - Track variable declarations and assignments
        - Identify reads before writes (use-before-def)
        - Detect dead assignments (write without read before next write)
        - Check for uninitialized variables passed as function arguments
    *   **Fix:** Ensure proper initialization order or remove dead assignments:
        ```typescript
        function processData() {
          const data = fetchData();
          console.log(data); // Use after initialization
          
          const result = transformResult(computeResult(data)); // Direct use
        }
        ```
    *   **False Positive Patterns:**
        - Variables initialized in conditional branches (TypeScript handles this)
        - Variables used in different scopes (hoisting, closures)
        - Intentional dead assignments (e.g., clearing sensitive data)

6.  **Boundary Condition Errors (Hard Block):**
    *   **Pattern Detection:** Detect off-by-one errors in loops, wrong comparison operators (`<=` vs `<`, `==` vs `===`), or incorrect boundary handling in range checks.
    *   **AST Pattern:** Loop conditions with `<= array.length` instead of `< array.length`, or comparison operators that don't match intended semantics.
    *   **Example Violation:**
        ```typescript
        for (let i = 0; i <= array.length; i++) { // Off-by-one: should be <
          process(array[i]);
        }
        
        if (value < threshold) { // Should be <= for inclusive check
          return;
        }
        ```
    *   **Detection Method:**
        - Analyze loop boundaries: `for`, `while`, `do-while` loops
        - Check comparison operators in loop conditions
        - Identify `<= array.length` patterns (should be `< array.length` for 0-based indexing)
        - Detect `==` instead of `===` (loose equality)
        - Flag boundary checks that don't account for edge cases (empty arrays, null, zero, negative numbers)
    *   **Fix:** Correct boundary conditions and comparison operators:
        ```typescript
        for (let i = 0; i < array.length; i++) { // Correct boundary
          process(array[i]);
        }
        
        if (value <= threshold) { // Inclusive check
          return;
        }
        ```
    *   **False Positive Patterns:**
        - Intentional inclusive boundaries (documented behavior)
        - 1-based indexing (uncommon in TypeScript but valid)
        - Loose equality that's intentional (e.g., type coercion needed)

7.  **Logical Operator Errors (Hard Block):**
    *   **Pattern Detection:** Detect incorrect use of logical operators (`&&` vs `||`, missing negations, double negations that cancel out), or conditions that can never be true/false due to logical flaws.
    *   **AST Pattern:** Logical expressions with operators that don't match intended semantics, or conditions that are always true/false.
    *   **Example Violation:**
        ```typescript
        if (user && admin) { // Should be || (user OR admin)
          grantAccess();
        }
        
        if (!condition && !condition) { // Double negation, always false
          doSomething();
        }
        
        if (value > 10 && value < 5) { // Always false
          process();
        }
        ```
    *   **Detection Method:**
        - Analyze logical expressions: `&&`, `||`, `!` operators
        - Detect De Morgan's law violations
        - Identify always-true/always-false conditions
        - Check for double negations that cancel out
        - Flag common mistakes: `&&` when `||` intended (or vice versa)
    *   **Fix:** Correct logical operators and conditions:
        ```typescript
        if (user || admin) { // OR instead of AND
          grantAccess();
        }
        
        if (condition) { // Remove double negation
          doSomething();
        }
        
        if (value > 10 || value < 5) { // OR for valid range
          process();
        }
        ```
    *   **False Positive Patterns:**
        - Intentional always-false conditions (e.g., unreachable code markers)
        - Complex logic that's correct but appears wrong
        - Conditions that are contextually valid

8.  **Interface Contract Violations (Hard Block):**
    *   **Pattern Detection:** Detect missing required fields in return values, wrong return types, or objects that don't satisfy interface contracts.
    *   **AST Pattern:** Return statements with object literals that don't match the declared return type interface.
    *   **Example Violation:**
        ```typescript
        interface User {
          id: string;
          name: string;
          email: string; // Required
        }
        
        function getUser(): User {
          return {
            id: '123',
            name: 'John'
            // Missing required 'email' field
          };
        }
        ```
    *   **Detection Method:**
        - Use TypeScript compiler API to get return types
        - Extract interface/type definitions
        - Compare return object literals with interface requirements
        - Identify missing required properties
        - Check for type mismatches (wrong property types)
    *   **Fix:** Add missing required fields or correct types:
        ```typescript
        function getUser(): User {
          return {
            id: '123',
            name: 'John',
            email: 'john@example.com' // Add missing field
          };
        }
        ```
    *   **False Positive Patterns:**
        - Partial types that are intentionally incomplete
        - Type assertions that are valid
        - Objects that satisfy interface through inheritance

9.  **Parameter Conflicts (Hard Block):**
    *   **Pattern Detection:** Detect optional parameters that semantically conflict when both are provided (e.g., both `status?: T` and `includeCompleted?: boolean` modify the same query filter).
    *   **AST Pattern:** Function/method signatures with multiple optional parameters that affect the same behavior, combined with conditional logic that might cause conflicts.
    *   **Example Violation:**
        ```typescript
        function getUsers(options?: {
          status?: UserStatus;
          includeCompleted?: boolean;
        }) {
          const where: any = {};
          
          if (options?.status) {
            where.status = options.status;
          }
          
          if (options?.includeCompleted === false) {
            where.status = { not: 'COMPLETED' }; // Conflicts with status above
          }
          
          return db.user.findMany({ where });
        }
        ```
    *   **Detection Method:**
        - Analyze function signatures for optional parameters
        - Identify parameters that modify the same behavior (same property, same filter, same option)
        - Check conditional logic for conflicts
        - Flag when multiple conflicting parameters are used together
    *   **Fix:** Establish explicit precedence rules (if/else chains) over spread operator conflicts:
        ```typescript
        function getUsers(options?: {
          status?: UserStatus;
          includeCompleted?: boolean;
        }) {
          const where: any = {};
          
          if (options?.status) {
            // Explicit parameter takes precedence
            where.status = options.status;
          } else if (options?.includeCompleted === false) {
            // Derived filter only if explicit not provided
            where.status = { not: 'COMPLETED' };
          }
          
          return db.user.findMany({ where });
        }
        ```
    *   **False Positive Patterns:**
        - Parameters that don't actually conflict (different behaviors)
        - Conflicts that are documented and intentional
        - Parameters with clear precedence rules

**III. AI-Enhanced Semantic Analysis**

For each bug category, perform LLM-based semantic analysis to enhance detection beyond AST pattern matching:

1.  **Context-Aware Pattern Matching:**
    *   Analyze code context beyond syntax (variable names, function names, comments)
    *   Understand domain-specific patterns (e.g., "status" in payment systems vs. user profiles)
    *   Consider surrounding code to reduce false positives

2.  **Domain-Specific Rule Inference:**
    *   Learn from codebase patterns to identify domain-specific rules
    *   Adapt detection based on project conventions
    *   Recognize valid patterns that might look like bugs in other contexts

3.  **Heuristic Confidence Scoring:**
    *   Assign confidence scores (High/Medium/Low) to each detection
    *   High confidence: Clear pattern match with no mitigating factors
    *   Medium confidence: Pattern match but context suggests it might be intentional
    *   Low confidence: Weak pattern match or high likelihood of false positive

4.  **False Positive Reduction:**
    *   Use semantic understanding to filter out known false positive patterns
    *   Consider code comments that explain intentional behavior
    *   Recognize framework-specific patterns (e.g., NestJS lifecycle hooks)

**IV. Actionability and Automated Remediation**

1.  **Feedback Format:** Provide specific, actionable feedback listing:
    *   File path and line number
    *   Bug category and severity
    *   Issue description with code snippet
    *   Detected pattern signature
    *   Confidence level (High/Medium/Low)
    *   Direct suggestion for remediation with code example

2.  **Output Format:**
    ```
    ❌ [Category] - [Severity: Blocker/Critical/Warning]
    Issue: [Clear description of the semantic bug]
    Location: [File:Line:Column]
    Pattern: [Detected pattern signature]
    Confidence: [High/Medium/Low]
    Fix: [Specific remediation with code example]
    
    Example:
    ❌ Object Spread Conflicts - Blocker
    Issue: Multiple conditional spreads assign to same property 'status', causing precedence ambiguity
    Location: src/users/services/user.service.ts:45:12
    Pattern: multiple_conditional_spreads_same_key
    Confidence: High
    Fix: Use explicit if/else logic:
      if (options?.status) {
        where.status = options.status;
      } else if (options?.includeCompleted === false) {
        where.status = { not: 'COMPLETED' };
      }
    ```

3.  **Quick Fix Mandate (LLM Integration):** For detected issues:
    *   Generate a structural fix based on the fix template for the bug category
    *   **Verification Loop:** If fix is applied, run targeted unit tests to verify
    *   The fix is only successful if all targeted tests pass
    *   If tests fail, revert the fix and provide alternative suggestions

**V. Integration with code-quality-check.md**

This command complements `code-quality-check.md` by:
- Running after `code-quality-check` passes (optional chaining)
- Focusing on deeper semantic analysis vs. syntax-level checks
- Sharing the same feedback format for consistency
- Can be invoked together: `/code quality check && /semantic bug check`
- Providing more detailed analysis for semantic bugs that require context understanding

**Key Differences:**

| Aspect | code-quality-check | semantic-bug-check |
|--------|-------------------|-------------------|
| Scope | Diff-only (fast) | Hybrid (diff + full) |
| Focus | Syntax + basic semantics | Deep semantic analysis |
| Method | Rule-based | Pattern + AI-enhanced |
| Speed | Sub-second | Seconds to minutes |
| Detection Depth | Surface-level patterns | Context-aware deep analysis |


