import { Injectable, BadRequestException } from '@nestjs/common';
import { create, all, MathJsStatic, MathJsInstance } from 'mathjs';

/**
 * FormulaValidationService - Single Responsibility: Formula validation
 *
 * Validates custom MMR formulas for safety and correctness.
 * Uses mathjs with sandboxed evaluation to prevent code injection.
 */
@Injectable()
export class FormulaValidationService {
  private readonly math: MathJsInstance;
  private readonly allowedVariables = [
    'ones',
    'twos',
    'threes',
    'fours',
    'onesGames',
    'twosGames',
    'threesGames',
    'foursGames',
    'totalGames',
  ];

  constructor() {
    // Create a sandboxed math.js instance
    // Use all functions but we'll validate variable usage separately
    this.math = create(all);
  }

  /**
   * Validate formula syntax and safety
   * Single Responsibility: Formula validation
   *
   * @param formula - Formula string to validate
   * @returns Validation result with parsed expression if valid
   */
  validateFormula(formula: string): {
    valid: boolean;
    error?: string;
    parsedExpression?: any;
  } {
    if (!formula || typeof formula !== 'string' || formula.trim().length === 0) {
      return {
        valid: false,
        error: 'Formula cannot be empty',
      };
    }

    try {
      // Parse the formula to check syntax
      const expr = this.math.parse(formula);

      // Extract variables used in the formula
      const usedVariables = this.extractVariables(expr);

      // Check for disallowed variables
      const disallowedVars = usedVariables.filter(
        (v) => !this.allowedVariables.includes(v),
      );
      if (disallowedVars.length > 0) {
        return {
          valid: false,
          error: `Disallowed variables: ${disallowedVars.join(', ')}. Allowed: ${this.allowedVariables.join(', ')}`,
        };
      }

      // Test evaluation with sample data to ensure it works
      const testData = this.getTestData();
      const result = expr.evaluate(testData);

      // Check if result is a valid number
      if (typeof result !== 'number' || !isFinite(result)) {
        return {
          valid: false,
          error: 'Formula must evaluate to a finite number',
        };
      }

      return {
        valid: true,
        parsedExpression: expr,
      };
    } catch (error: any) {
      return {
        valid: false,
        error: error.message || 'Invalid formula syntax',
      };
    }
  }

  /**
   * Extract variable names from parsed expression
   * Single Responsibility: Variable extraction
   */
  private extractVariables(expr: any): string[] {
    const variables = new Set<string>();
    // List of known mathjs function names to exclude from variable extraction
    const functionNames = new Set([
      'abs', 'acos', 'asin', 'atan', 'ceil', 'cos', 'exp', 'floor', 'log',
      'log10', 'max', 'min', 'pow', 'round', 'sin', 'sqrt', 'tan',
      'add', 'subtract', 'multiply', 'divide', 'mod',
      'equal', 'unequal', 'smaller', 'larger', 'smallerEq', 'largerEq',
      'and', 'or', 'not',
    ]);

    const traverse = (node: any) => {
      if (!node || typeof node !== 'object') {
        return;
      }

      // math.js uses 'SymbolNode' for variables
      // Only add if it's not a function name and not in a FunctionNode context
      if (node.type === 'SymbolNode' && node.name) {
        // Check if parent is a FunctionNode - if so, it's a function call, not a variable
        // We'll check this by seeing if we're inside a FunctionNode's args
        // For now, just exclude known function names
        if (!functionNames.has(node.name)) {
          variables.add(node.name);
        }
      }

      // Traverse children
      if (node.args && Array.isArray(node.args)) {
        node.args.forEach(traverse);
      }

      // Traverse other properties
      for (const key in node) {
        if (node.hasOwnProperty(key) && key !== 'args') {
          const value = node[key];
          if (Array.isArray(value)) {
            value.forEach(traverse);
          } else if (value && typeof value === 'object') {
            traverse(value);
          }
        }
      }
    };

    traverse(expr);
    return Array.from(variables);
  }

  /**
   * Get test data for formula validation
   * Single Responsibility: Test data provision
   */
  private getTestData(): Record<string, number> {
    return {
      ones: 1200,
      twos: 1400,
      threes: 1600,
      fours: 1000,
      onesGames: 150,
      twosGames: 300,
      threesGames: 500,
      foursGames: 50,
      totalGames: 1000,
    };
  }
}

