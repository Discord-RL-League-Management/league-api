/conventional commit

**Objective:** Initiate an interactive session to generate a commit message that strictly adheres to the Conventional Commits Specification (v1.0.0). The process must enforce the required structure and semantic rules to enable automated SemVer releases and changelog generation. Once the message is validated, **automatically commit the currently staged changes** with the generated message.

**I. Interactive Message Generation (CZ Commit Simulation)**

Guide the user through the following required fields in a sequential, interactive workflow, ensuring the final message conforms to the three-part structure: **Header** (Type, Scope, Description), **Body**, and **Footers**.

1.  **Select Type (Mandatory):** Present the following list of standard types and enforce selection:
    *   `feat`: New feature (MINOR version bump).
    *   `fix`: Bug fix (PATCH version bump).
    *   `refactor`: Internal code restructuring without behavioral change.
    *   `perf`: Code change improving performance.
    *   `docs`: Documentation only changes.
    *   `test`: Adding or correcting tests.
    *   `chore`: Maintenance tasks (e.g., dependency updates, tooling).
    *   `build`/`ci`: Changes to build system or CI configuration.
2.  **Enter Optional Scope:** Prompt for a short, descriptive scope (e.g., `(api)`, `(auth)`). If provided, it must be enclosed in parentheses.
3.  **Breaking Change Flag (Conditional):** Ask if the change introduces a breaking API change. If yes, append `!` to the header immediately before the colon.
4.  **Enter Short Description (Mandatory Header):** Prompt for a concise summary (max ~50 chars). The description MUST be in the imperative, present tense (e.g., "Add feature," not "Added feature") and MUST NOT end with punctuation.
5.  **Enter Body (Optional):** Prompt for a longer description detailing the motivation for the change and contrasting it with previous behavior.
6.  **Enter Footers (Optional):** Prompt for metadata such as issue references (e.g., `Refs: #123`) or sign-offs.

**II. Compliance and Validation Rules**

The final generated message must be validated against these strict rules:

1.  **Header Format:** Must follow the format `<type>[optional scope][optional!]: <description>`.
2.  **Structural Separation:** The Header, Body, and Footers must be separated by single, mandatory blank lines.
3.  **Breaking Change Enforcement:** If a breaking change is flagged (`!`) in the header, ensure the message includes a detailed description in the body or a dedicated `BREAKING CHANGE:` footer token. The `BREAKING CHANGE` token must be fully capitalized.
4.  **Non-SemVer Types:** Types other than `feat` or `fix` (e.g., `docs`, `chore`) do not trigger a version bump unless they include a `BREAKING CHANGE` indicator.

**III. Final Output and Execution Command**

1.  Generate the final, fully formatted commit message text.
2.  Explicitly state the determined Semantic Versioning impact (PATCH, MINOR, or MAJOR).
3.  **Automatically execute `git commit` with the generated message to commit the currently staged changes. Do not ask for confirmation - execute the commit immediately after generating and validating the message.**
