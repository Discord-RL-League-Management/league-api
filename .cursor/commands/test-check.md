/test check [optional file/directory]

**Objective:** Analyze the target test suite (or the tests related to the specified file/directory) for adherence to the Black Box Axiom. The goal is to identify tests that are coupled to implementation details, causing fragility and maintenance risk.

**I. Foundational Test Architecture Definitions**

1.  **Test Levels Scope:**
    *   **Unit Tests:** Focus on the smallest, most isolated unit of code (e.g., a function or method).[1] Must be fast, reliable, and entirely decoupled from external dependencies .
    *   **Integration Tests:** Focus on verifying that different modules or components interact correctly at their boundaries and contract points.[2]
    *   **System/Acceptance Tests:** Focus on the overall external behavior of the system, verifying user requirements (pure Black Box approach) .
2.  **Verification Styles Mandate:**
    *   **State Verification (Preferred):** Tests should primarily verify the ultimate outcome and resultant state changes (the "what").[3] This approach is favored to minimize coupling.
    *   **Behavior Verification (Cautionary):** Tests that verify the internal interactions (outbound calls, frequency) of the SUT to its collaborators are highly implementation-coupled and should be avoided unless strictly necessary.[3]

**II. Core Principles and Enforcement Mandate**

1.  **Black Box Axiom:** Enforce that tests must focus exclusively on the external, public contract of the SUT. Assertions must verify inputs, outputs, and observable side effects or final state, not internal execution flow .
2.  **Test Fragility Check:** Flag any test that is structure-sensitive—meaning it will break if the SUT's internal structure or private methods are modified, even if the external behavior remains unchanged .

**III. Violation Detection (Implementation Coupling Anti-Patterns)**

Scan test files for the following anti-patterns and classify them as violations:

1.  **Implementation-Coupled Interaction Verification:** Detect excessive use of spies or mocks on non-public methods, or the use of reflection to access internal fields or private methods of the SUT . This strongly indicates a violation of the Single Responsibility Principle (SRP) in the SUT.
2.  **Logical Dependency and Duplication:** Identify assertions in the test code that contain non-trivial logic which duplicates complex validation or calculation steps already present in the production code's SUT.[4]
3.  **Test Complexity Smell:** Calculate the **Cyclomatic Complexity ($v(G)$)** for individual test methods. Flag any test method that exceeds the suggested limit (e.g., **$v(G) > 7$**) as a high-risk smell, potentially indicating "Assertion Roulette" or overly complicated setup logic .

**IV. Exception Protocol (White Box Justification)**

If implementation-coupled tests are found, check surrounding documentation and comments for explicit justification:

1.  **White Box Exception Criteria:** Only tolerate structural verification (White Box) if it is explicitly documented and necessary for high-risk scenarios, such as verifying complex algorithmic correctness, intricate state machine flow, or specific security/compliance requirements .
2.  **Classification:** If the test meets and documents the exception criteria, classify the finding as **White Box Exception (Justified)**. If not, classify it as **Implementation-Coupled Violation**.

**V. Remediation Suggestion**

For all identified **Implementation-Coupled Violations**, propose an architectural correction strategy:

1.  **SUT Refactoring:** Suggest breaking the SUT down to fix the underlying SRP violation (e.g., "Decompose SUT by extracting internal logic into a new, smaller, publicly testable unit") .
2.  **Dependency Inversion:** Recommend applying the **Extract Interface Pattern** to decouple the SUT from its collaborators, allowing the use of controlled Test Doubles instead of spies .

**VI. Final Output**

Generate a structured report listing all identified tests, their classification (Behavioral, Violation, or Exception), the governing metric (e.g., $v(G)=12$), and the corresponding remediation plan.
