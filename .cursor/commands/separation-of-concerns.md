/separation of concerns <word>

**Objective:** Perform a deep, three-pass architectural analysis focused on the Separation of Concerns (SoC) principle for the codebase, starting the analysis centered around the component, file, or module indicated by `<word>`.

**Pre-Pass: Architectural Context Setting (2025 Standard)**
1.  **Technology Synthesis:** Determine the primary technology stack, date the analysis to the current year (2025), and classify the system's architectural topology (e.g., Layered Monolith, Modular Monolith, Microservices, Serverless).
2.  **Principle Foundation:** Use the **Principle of Independent Variation (PIV)** as the architectural standard: "separate elements that vary independently; unify elements that vary dependently."
3.  **Layer Identification:** Map architectural layers:
    *   **Presentation Layer:** Controllers (HTTP endpoints, request/response handling)
    *   **Business Layer:** Services (domain logic, business rules)
    *   **Data Layer:** Repositories (data access, persistence)
    *   **Infrastructure Layer:** Adapters, Infrastructure modules (cross-cutting concerns)
4.  **Module Boundary Analysis:** Classify each module as:
    *   **API Module:** Contains only controllers (presentation)
    *   **Domain Module:** Contains only services (business logic)
    *   **Data Module:** Contains only repositories (data access)
    *   **Mixed Module:** Contains multiple layers (VIOLATION)

**Pass 1: Diagnostics and Violation Quantification**
1.  **Cohesion Metric:** For all classes/modules related to `<word>`, calculate the **Lack of Cohesion in Methods (LCOM)** score (preferably as a percentage). Flag any component with LCOM > 75% as a severe violation of the Single Responsibility Principle (SRP).
2.  **Coupling Metric:** Calculate **Coupling Between Objects (CBO)**, focusing particularly on dependencies that cross identified architectural boundaries (e.g., Presentation layer accessing Data layer, or cross-Bounded Context coupling in a Modular Monolith).
3.  **Layer Violation Detection:**
    *   Flag modules containing both Controllers AND Services as **Anti-Pattern** (HTTP concerns mixed with business logic)
    *   Calculate **Layer Mixing Index (LMI)**: `(controllers_count + services_count + repositories_count) / total_providers`
    *   Flag LMI > 0.5 as violation (multiple architectural layers in one module)
    *   Identify modules requiring Gateway extraction (controllers in domain modules)
4.  **Direct Service Coupling Detection:**
    *   For each module import, analyze if it's imported solely to use a concrete service class
    *   Flag imports like `GuildsModule` → `GuildsService` (direct service dependency) as **Anti-Pattern**
    *   Require interface-based dependencies (adapters, injection tokens) instead
    *   Calculate **Direct Coupling Ratio**: `direct_service_imports / total_module_imports`
5.  **Circular Dependency Detection:**
    *   Count `forwardRef()` usage per module
    *   Flag any module with `forwardRef()` as **Code Smell** (indicates architectural coupling)
    *   Calculate **Circular Dependency Index (CDI)**: `forwardRef_count / total_imports`
    *   Document all circular dependency chains
6.  **Module Concern Mixing:**
    *   Check if module contains: Controllers + Services + Repositories + Adapters
    *   Flag as **Anti-Pattern** if all 4 types present
    *   Generate **Concern Mixing Score**: count of distinct architectural concerns (0-4)
    *   Flag modules with score ≥ 3 as severe violation
7.  **Output:** Provide feedback in chat/composer only (no report files). Generate a **Violation Register** listing:
    *   Component names
    *   Calculated LCOM, CBO, LMI, CDI, and Concern Mixing scores
    *   Classification as either **Code Smell** (warrants investigation) or **Anti-Pattern** (mandates correction)
    *   Specific violations: Layer mixing, Direct service coupling, Circular dependencies

**Pass 2: Impact Assessment and Risk Quantification**
1.  **Dependency Mapping:** Construct a "runtime-aware" dependency graph that incorporates code volatility (change frequency/Code Churn).
2.  **Hotspot Identification:** Identify **Hotspots**—components with low Code Health (poor P1 metrics) that also exhibit high Code Churn.
3.  **Risk Index:** Calculate the **Dependency Hell Index (DHI)**, quantifying the scope of transitive dependencies that would require modification or retesting if the target component is refactored.
4.  **Gateway Extraction Complexity:**
    *   Calculate effort to extract controllers from domain modules
    *   Count controllers per domain module
    *   Flag modules with >1 controller as high extraction complexity
    *   Identify cross-module controller dependencies
5.  **Interface Adoption Gap:**
    *   Measure ratio of direct service imports vs interface-based imports
    *   Calculate **Interface Adoption Ratio**: `interface_imports / total_service_imports`
    *   Flag modules with ratio < 0.3 as high coupling risk
    *   Quantify refactoring effort to convert direct imports to interfaces
6.  **Output:** Provide feedback in chat/composer only (no report files). Generate an **Impact Analysis Register** correlating:
    *   Severity (P1 metrics: LCOM, CBO, LMI, CDI)
    *   Systemic impact (Hotspots, DHI score, Gateway extraction complexity, Interface adoption gap)
    *   **Refactoring Priority Score (RPS)** for each violation

**Pass 3: Remediation Strategy and Phased Plan**
1.  **Correction Plan:** Create a prioritized, time-bound remediation strategy for the top three high-RPS violations identified in Pass 2.
2.  **Behavioral Preservation:** Mandate that all refactoring steps must first be preceded by either identifying existing, or generating comprehensive, integration and unit tests to ensure **behavioral preservation**.
3.  **Pattern Mandate:** Prescribe specific, appropriate refactoring patterns:
    *   For high-LCOM/low-CBO issues, recommend local **Extract Class/Extract Method** micro-refactorings.
    *   For high-CBO/high-DHI architectural issues (Hotspots), mandate a **Strangler Fig Pattern** approach.
    *   **For Layer Violations (controllers in domain modules):** Mandate **Gateway Pattern** extraction:
        *   Create separate `*-api.module.ts` or `*-gateway.module.ts` for controllers
        *   Move all controllers from domain modules to gateway modules
        *   Gateway modules import domain modules (not vice versa)
    *   **For Direct Service Coupling:** Mandate **Dependency Inversion**:
        *   Convert direct service imports to interface-based dependencies
        *   Use adapter pattern for cross-module communication
        *   Replace `ModuleA` → `ServiceB` with `ModuleA` → `IAdapter` → `ServiceB`
    *   **For Circular Dependencies:** Mandate **Dependency Inversion** or **Event-Driven** patterns:
        *   Break cycles using interfaces/adapters
        *   Consider event-based communication for cross-module coordination
    *   **For Mixed Concern Modules:** Mandate **Module Decomposition**:
        *   Separate into `*-api.module.ts` (controllers only)
        *   Separate into `*-domain.module.ts` (services only)
        *   Separate into `*-data.module.ts` (repositories only)
        *   Maintain clear dependency direction: API → Domain → Data
4.  **Final Output:** Provide feedback in chat/composer only (no report files). Present the analysis in the format of a **Phased Correction Plan** table linking:
    *   Violation ID
    *   Violation type (Layer mixing, Direct coupling, Circular dependency, Mixed concerns)
    *   The mandated refactoring pattern
    *   Key milestones
    *   Estimated effort/timeframe
    *   Dependencies between refactoring tasks

**Feedback Protocol**
- **No Report Files:** Provide feedback only in the chat/composer.
- **Format:** Use structured markdown with violation classifications, metrics, and remediation patterns.
- **Violation Format:** Include violation IDs, calculated metrics (LCOM, CBO, LMI, CDI, Concern Mixing Score), classification (Code Smell vs Anti-Pattern), and specific remediation mandates.
