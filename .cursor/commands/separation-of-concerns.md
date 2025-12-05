/separation of concerns <word>

**Objective:** Perform a deep, three-pass architectural analysis focused on the Separation of Concerns (SoC) principle for the codebase, starting the analysis centered around the component, file, or module indicated by `<word>`.

**Pre-Pass: Architectural Context Setting (2025 Standard)**
1.  **Technology Synthesis:** Determine the primary technology stack, date the analysis to the current year (2025), and classify the system's architectural topology (e.g., Layered Monolith, Modular Monolith, Microservices, Serverless).
2.  **Principle Foundation:** Use the **Principle of Independent Variation (PIV)** as the architectural standard: "separate elements that vary independently; unify elements that vary dependently."

**Pass 1: Diagnostics and Violation Quantification**
1.  **Cohesion Metric:** For all classes/modules related to `<word>`, calculate the **Lack of Cohesion in Methods (LCOM)** score (preferably as a percentage). Flag any component with LCOM > 75% as a severe violation of the Single Responsibility Principle (SRP).
2.  **Coupling Metric:** Calculate **Coupling Between Objects (CBO)**, focusing particularly on dependencies that cross identified architectural boundaries (e.g., Presentation layer accessing Data layer, or cross-Bounded Context coupling in a Modular Monolith).
3.  **Output:** Generate a **Violation Register** listing component names, the calculated LCOM and CBO scores, and classifying findings as either a **Code Smell** (warrants investigation) or an **Anti-Pattern** (mandates correction, e.g., a "God Class" detected via LCOM > 75%).

**Pass 2: Impact Assessment and Risk Quantification**
1.  **Dependency Mapping:** Construct a "runtime-aware" dependency graph that incorporates code volatility (change frequency/Code Churn).
2.  **Hotspot Identification:** Identify **Hotspots**—components with low Code Health (poor P1 metrics) that also exhibit high Code Churn.
3.  **Risk Index:** Calculate the **Dependency Hell Index (DHI)**, quantifying the scope of transitive dependencies that would require modification or retesting if the target component is refactored.
4.  **Output:** Generate an **Impact Analysis Register** correlating the severity (P1 metrics) with the systemic impact (Hotspots and DHI score) to derive a **Refactoring Priority Score (RPS)** for each violation.

**Pass 3: Remediation Strategy and Phased Plan**
1.  **Correction Plan:** Create a prioritized, time-bound remediation strategy for the top three high-RPS violations identified in Pass 2.
2.  **Behavioral Preservation:** Mandate that all refactoring steps must first be preceded by either identifying existing, or generating comprehensive, integration and unit tests to ensure **behavioral preservation**.
3.  **Pattern Mandate:** Prescribe specific, appropriate refactoring patterns:
    *   For high-LCOM/low-CBO issues, recommend local **Extract Class/Extract Method** micro-refactorings.
    *   For high-CBO/high-DHI architectural issues (Hotspots), mandate a **Strangler Fig Pattern** approach.
4.  **Final Output:** Present the analysis in the format of a **Phased Correction Plan** table linking the violation ID, the mandated refactoring pattern, key milestones, and an estimated effort/timeframe.
