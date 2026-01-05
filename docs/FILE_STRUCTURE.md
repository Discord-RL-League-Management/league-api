# File Structure Conventions

This document outlines the file structure conventions for the league-api project, aligned with NestJS CLI defaults and best practices.

## Controller File Locations

### Standard Convention

Controllers should be located at the **module root** directory, following NestJS CLI conventions.

**NestJS CLI Behavior:**
```bash
nest g controller users
# Generates: src/users/users.controller.ts (at module root)
```

### Current Structure

All controllers are located at their respective module roots:

- `src/trackers/tracker.controller.ts`
- `src/trackers/tracker-admin.controller.ts`
- `src/mmr-calculation/mmr-calculation.controller.ts`
- `src/mmr-calculation/mmr-calculator-demo.controller.ts`
- `src/internal/internal-scheduled-processing.controller.ts`

### Exception Policy

Modules with **3 or more controllers** may use a `controllers/` subdirectory for organizational purposes, but this decision must be:

1. **Documented** in this file with rationale
2. **Justified** by clear separation of concerns (e.g., admin vs. user controllers, different API versions)
3. **Consistent** within the module (all controllers in subdirectory or all at root)

### Rationale

- **Consistency**: Aligns with NestJS CLI defaults, making the codebase predictable
- **Discoverability**: Controllers are easier to find when located at module root
- **Simplicity**: Reduces directory nesting and import path complexity
- **Tooling**: Works seamlessly with NestJS CLI generators

## Related Documentation

- [NestJS CLI Documentation](https://docs.nestjs.com/cli/usages#nest-generate)
- [NestJS File Structure Best Practices](https://docs.nestjs.com/fundamentals/module-ref)

