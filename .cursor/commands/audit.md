# /audit
Analyze the project architecture and existing documentation (SOC files).

1. **Behavioral Extraction**: 
   - Use `@Codebase` to identify high-level user flows in `src/`.
   - Reverse-engineer these flows into Gherkin `.feature` files in `/features`.
2. **Modular Spec Generation**: 
   - Create a `/specs` directory.
   - For each NestJS module found, create a `module.md` spec that defines its Behavioral Contract.
3. **Traceability Mapping**: 
   - Generate a `SYSTEM_MAP.md` that links every `/features/*.feature` to its corresponding `/specs/*.md` and its implementation in `src/`.
4. **Gap Analysis**: 
   - Flag any `src/` files that have no corresponding behavior defined in `/features`.