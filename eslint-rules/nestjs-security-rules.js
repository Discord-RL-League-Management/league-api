/**
 * Custom NestJS Security Rules for ESLint
 *
 * These rules enforce NestJS-specific security patterns that general
 * security plugins don't cover.
 */

module.exports = {
  rules: {
    /**
     * Rule: Internal endpoints must use BotAuthGuard, not JwtAuthGuard
     * Detects controllers with routes starting with /internal/ that use JwtAuthGuard
     */
    'internal-endpoint-must-use-bot-auth': {
      meta: {
        type: 'problem',
        docs: {
          description:
            'Internal endpoints must use BotAuthGuard, not JwtAuthGuard',
          category: 'Security',
          recommended: true,
        },
        messages: {
          useBotAuth:
            'Internal endpoint controllers must use BotAuthGuard, not JwtAuthGuard. Found: {{guardName}}',
        },
        fixable: null,
        schema: [],
      },
      create(context) {
        return {
          ClassDeclaration(node) {
            // Check if this is a controller with @Controller('internal/...')
            const decorators = node.decorators || [];
            let isInternalController = false;
            let hasJwtAuthGuard = false;
            let hasBotAuthGuard = false;
            let guardName = null;

            for (const decorator of decorators) {
              const expr = decorator.expression;

              // Check for @Controller('internal/...')
              if (
                expr &&
                expr.callee &&
                expr.callee.name === 'Controller' &&
                expr.arguments &&
                expr.arguments.length > 0
              ) {
                const controllerPath = expr.arguments[0];
                if (
                  controllerPath.type === 'Literal' &&
                  typeof controllerPath.value === 'string' &&
                  controllerPath.value.startsWith('internal/')
                ) {
                  isInternalController = true;
                }
              }

              // Check for @UseGuards(JwtAuthGuard)
              if (expr && expr.callee && expr.callee.name === 'UseGuards') {
                const guards = expr.arguments || [];
                for (const guard of guards) {
                  if (guard.type === 'Identifier') {
                    if (guard.name === 'JwtAuthGuard') {
                      hasJwtAuthGuard = true;
                      guardName = 'JwtAuthGuard';
                    } else if (guard.name === 'BotAuthGuard') {
                      hasBotAuthGuard = true;
                    }
                  }
                }
              }
            }

            if (isInternalController && hasJwtAuthGuard && !hasBotAuthGuard) {
              context.report({
                node,
                messageId: 'useBotAuth',
                data: { guardName },
              });
            }
          },
        };
      },
    },

    /**
     * Rule: Detect hardcoded secrets in service files
     * Detects common patterns of hardcoded API keys, tokens, passwords
     */
    'detect-hardcoded-secrets': {
      meta: {
        type: 'problem',
        docs: {
          description: 'Detect hardcoded secrets (API keys, tokens, passwords)',
          category: 'Security',
          recommended: true,
        },
        messages: {
          hardcodedSecret:
            'Potential hardcoded secret detected. Use environment variables instead.',
        },
        fixable: null,
        schema: [],
      },
      create(context) {
        const secretPatterns = [
          // API keys
          /['"](?:sk|pk)_(?:live|test)_[a-zA-Z0-9]{24,}/,
          /['"]AIza[0-9A-Za-z-_]{35}/,
          /['"]bot_[a-zA-Z0-9_.]{20,}/,
          // Tokens
          /['"]eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*/,
          // Passwords (simple detection - may have false positives)
          /password\s*[:=]\s*['"][^'"]{8,}['"]/i,
          /['"]password['"]\s*:\s*['"][^'"]{8,}['"]/i,
        ];

        return {
          Literal(node) {
            if (typeof node.value === 'string' && node.value.length > 8) {
              for (const pattern of secretPatterns) {
                if (pattern.test(node.value)) {
                  // Skip if it's in a comment or already using process.env
                  const sourceCode = context.getSourceCode();
                  const text = sourceCode.getText(node);
                  const parent = node.parent;

                  // Skip if parent is process.env access
                  if (
                    parent &&
                    parent.type === 'MemberExpression' &&
                    parent.object &&
                    parent.object.type === 'MemberExpression' &&
                    parent.object.object &&
                    parent.object.object.name === 'process' &&
                    parent.object.property &&
                    parent.object.property.name === 'env'
                  ) {
                    return;
                  }

                  context.report({
                    node,
                    messageId: 'hardcodedSecret',
                  });
                  break;
                }
              }
            }
          },
        };
      },
    },

    /**
     * Rule: Detect exposed sensitive fields in DTOs
     * Warns about DTO properties that match sensitive patterns without @Exclude()
     */
    'detect-exposed-sensitive-fields': {
      meta: {
        type: 'suggestion',
        docs: {
          description:
            'Detect DTO fields that may expose sensitive data without @Exclude()',
          category: 'Security',
          recommended: true,
        },
        messages: {
          exposedSensitiveField:
            'DTO field "{{fieldName}}" matches sensitive pattern. Consider using @Exclude() decorator.',
        },
        fixable: null,
        schema: [],
      },
      create(context) {
        const sensitivePatterns = [
          /password/i,
          /token/i,
          /secret/i,
          /api[_-]?key/i,
          /private[_-]?key/i,
          /access[_-]?token/i,
          /refresh[_-]?token/i,
        ];

        return {
          PropertyDefinition(node) {
            if (!node.key || node.key.type !== 'Identifier') {
              return;
            }

            const fieldName = node.key.name;

            // Skip private/static fields and constants (they're not exposed)
            const isPrivate =
              node.accessibility === 'private' || fieldName.startsWith('_');
            const isStatic = node.static === true;
            const isReadonly = node.readonly === true;

            // Skip if it's a constant (UPPER_CASE) or private field
            if (
              isPrivate ||
              isStatic ||
              (isReadonly && fieldName === fieldName.toUpperCase())
            ) {
              return;
            }

            const hasSensitivePattern = sensitivePatterns.some((pattern) =>
              pattern.test(fieldName),
            );

            if (hasSensitivePattern) {
              // Check if @Exclude() decorator is present
              const decorators = node.decorators || [];
              const hasExclude = decorators.some((decorator) => {
                const expr = decorator.expression;
                return (
                  expr &&
                  ((expr.type === 'Identifier' && expr.name === 'Exclude') ||
                    (expr.type === 'CallExpression' &&
                      expr.callee &&
                      expr.callee.name === 'Exclude'))
                );
              });

              // Check if parent class is a DTO (has @ApiProperty or similar decorators)
              const parent = node.parent;
              if (parent && parent.type === 'ClassDeclaration') {
                const classDecorators = parent.decorators || [];
                const isDto = classDecorators.some((decorator) => {
                  const expr = decorator.expression;
                  return (
                    expr &&
                    expr.callee &&
                    (expr.callee.name === 'ApiProperty' ||
                      expr.callee.name === 'ApiPropertyOptional' ||
                      parent.id.name.endsWith('Dto') ||
                      parent.id.name.endsWith('DTO'))
                  );
                });

                // Only warn for DTOs, not utility classes or services
                if (isDto && !hasExclude) {
                  context.report({
                    node,
                    messageId: 'exposedSensitiveField',
                    data: { fieldName },
                  });
                }
              }
            }
          },
        };
      },
    },

    /**
     * Rule: Internal endpoints should use @SkipThrottle()
     * Warns if internal endpoint controllers are missing @SkipThrottle()
     */
    'internal-endpoint-should-skip-throttle': {
      meta: {
        type: 'suggestion',
        docs: {
          description:
            'Internal endpoints should use @SkipThrottle() decorator',
          category: 'Security',
          recommended: true,
        },
        messages: {
          missingSkipThrottle:
            'Internal endpoint controller should use @SkipThrottle() decorator.',
        },
        fixable: null,
        schema: [],
      },
      create(context) {
        return {
          ClassDeclaration(node) {
            const decorators = node.decorators || [];
            let isInternalController = false;
            let hasSkipThrottle = false;

            for (const decorator of decorators) {
              const expr = decorator.expression;

              // Check for @Controller('internal/...')
              if (
                expr &&
                expr.callee &&
                expr.callee.name === 'Controller' &&
                expr.arguments &&
                expr.arguments.length > 0
              ) {
                const controllerPath = expr.arguments[0];
                if (
                  controllerPath.type === 'Literal' &&
                  typeof controllerPath.value === 'string' &&
                  controllerPath.value.startsWith('internal/')
                ) {
                  isInternalController = true;
                }
              }

              // Check for @SkipThrottle()
              if (
                expr &&
                ((expr.type === 'Identifier' && expr.name === 'SkipThrottle') ||
                  (expr.type === 'CallExpression' &&
                    expr.callee &&
                    expr.callee.name === 'SkipThrottle'))
              ) {
                hasSkipThrottle = true;
              }
            }

            if (isInternalController && !hasSkipThrottle) {
              context.report({
                node,
                messageId: 'missingSkipThrottle',
              });
            }
          },
        };
      },
    },
  },
};
