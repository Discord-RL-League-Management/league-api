#!/usr/bin/env node
/**
 * Debt Marker Check Script
 * 
 * Scans staged git changes for technical debt markers and enforces
 * zero-tolerance policy by blocking commits until markers are resolved.
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

interface DebtMarker {
  file: string;
  lineNumber: number;
  content: string;
  marker: string;
  originalLineNumber: number; // Line number in the staged file
}

const DEBT_MARKERS = [
  'TODO',
  'FIXME',
  'HACK',
  'WORKAROUND',
  'OPTIMIZE',
  'BUG',
  'XXX',
];

// Pattern matches debt markers at the start of comments (// or /*) followed by colon or space
// This avoids false positives from explanatory comments that mention these words
const MARKER_PATTERN = new RegExp(
  `\/\/(?:\\s*\/)?\\s*(${DEBT_MARKERS.join('|')})(?::|\\s|$)|\\/\\*\\s*(${DEBT_MARKERS.join('|')})(?::|\\s|\\*)`,
  'i'
);

/**
 * Parse git diff --cached to extract only added/modified lines
 */
function getStagedChanges(): Map<string, string[]> {
  const diff = execSync('git diff --cached', { encoding: 'utf-8' });
  const changes = new Map<string, string[]>();
  
  let currentFile: string | null = null;
  let lineOffset = 0;
  let inHunk = false;
  let addedLineCount = 0;
  
  for (const line of diff.split('\n')) {
    // File header: +++ b/path/to/file
    if (line.startsWith('+++ b/')) {
      currentFile = line.substring(6);
      lineOffset = 0;
      inHunk = false;
      addedLineCount = 0;
      continue;
    }
    
    // Hunk header: @@ -oldStart,oldCount +newStart,newCount @@
    if (line.startsWith('@@')) {
      const match = line.match(/@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/);
      if (match && currentFile) {
        lineOffset = parseInt(match[1], 10) - 1; // -1 because we'll increment on first added line
        inHunk = true;
        addedLineCount = 0;
      }
      continue;
    }
    
    if (!inHunk || !currentFile) continue;
    
    // Added line: starts with +
    if (line.startsWith('+') && !line.startsWith('+++')) {
      const content = line.substring(1);
      const actualLineNumber = lineOffset + addedLineCount + 1;
      
      if (!changes.has(currentFile)) {
        changes.set(currentFile, []);
      }
      
      changes.get(currentFile)!.push(`${actualLineNumber}:${content}`);
      addedLineCount++;
    }
    
    // Context line (unchanged): starts with space
    if (line.startsWith(' ')) {
      lineOffset++;
    }
  }
  
  return changes;
}

/**
 * Scan a file's staged changes for debt markers
 */
function scanFileForMarkers(
  file: string,
  changedLines: string[]
): DebtMarker[] {
  const markers: DebtMarker[] = [];
  
  for (const lineData of changedLines) {
    const [lineNumStr, ...contentParts] = lineData.split(':');
    const lineNumber = parseInt(lineNumStr, 10);
    const content = contentParts.join(':'); // Rejoin in case content has colons
    
    const match = content.match(MARKER_PATTERN);
    if (match) {
      const marker = match[1].toUpperCase();
      markers.push({
        file,
        lineNumber,
        content: content.trim(),
        marker,
        originalLineNumber: lineNumber,
      });
    }
  }
  
  return markers;
}

/**
 * Generate Debt Marker Register
 */
function generateDebtRegister(markers: DebtMarker[]): string {
  if (markers.length === 0) {
    return '';
  }
  
  let register = '\n╔══════════════════════════════════════════════════════════════╗\n';
  register += '║           DEBT MARKER REGISTER - COMMIT BLOCKED           ║\n';
  register += '╚══════════════════════════════════════════════════════════════╝\n\n';
  register += `Found ${markers.length} technical debt marker(s) in staged changes:\n\n`;
  
  // Group by file
  const byFile = new Map<string, DebtMarker[]>();
  for (const marker of markers) {
    if (!byFile.has(marker.file)) {
      byFile.set(marker.file, []);
    }
    byFile.get(marker.file)!.push(marker);
  }
  
  for (const [file, fileMarkers] of byFile.entries()) {
    register += `📄 ${file}\n`;
    register += `${'─'.repeat(60)}\n`;
    
    for (const marker of fileMarkers) {
      register += `  Line ${marker.lineNumber} [${marker.marker}]:\n`;
      register += `    ${marker.content}\n\n`;
    }
  }
  
  register += '\n╔══════════════════════════════════════════════════════════════╗\n';
  register += '║                    RESOLUTION OPTIONS                         ║\n';
  register += '╚══════════════════════════════════════════════════════════════╝\n\n';
  register += 'You must resolve all debt markers before committing.\n\n';
  register += 'Option A: Manual Resolution\n';
  register += '  • Remove the marker and resolve the underlying issue\n';
  register += '  • Or remove the marker if the issue is already resolved\n';
  register += '  • Stage your changes and try committing again\n\n';
  register += 'Option B: Automated LLM Remediation\n';
  register += '  • Run: npm run debt:fix\n';
  register += '  • The AI will attempt to fix trivial issues automatically\n';
  register += '  • Fixes will be verified with unit tests before applying\n\n';
  
  return register;
}

/**
 * Get context around a marker for LLM remediation
 */
function getMarkerContext(file: string, lineNumber: number, contextLines = 10): string {
  try {
    const filePath = join(process.cwd(), file);
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    
    const start = Math.max(0, lineNumber - contextLines - 1);
    const end = Math.min(lines.length, lineNumber + contextLines);
    
    const context = lines.slice(start, end);
    const contextWithNumbers = context.map((line, idx) => {
      const actualLine = start + idx + 1;
      const marker = actualLine === lineNumber ? '>>> ' : '    ';
      return `${marker}${actualLine.toString().padStart(4)}: ${line}`;
    });
    
    return contextWithNumbers.join('\n');
  } catch (error) {
    return `Error reading file: ${error}`;
  }
}

/**
 * Generate LLM prompt for fixing a debt marker
 */
function generateFixPrompt(marker: DebtMarker): string {
  const context = getMarkerContext(marker.file, marker.lineNumber);
  
  return `Fix the following technical debt marker in the code:

File: ${marker.file}
Line: ${marker.lineNumber}
Marker: ${marker.marker}
Content: ${marker.content}

Context:
${context}

Requirements:
1. Resolve the underlying issue described by the marker
2. Remove the marker comment
3. Preserve all existing behavior
4. Follow the project's coding standards (NestJS, TypeScript)
5. Ensure type safety and error handling

Provide the complete fixed code for the affected section.`;
}

/**
 * Main execution
 */
function main() {
  try {
    // Check if there are staged changes
    const stagedFiles = execSync('git diff --cached --name-only', { encoding: 'utf-8' })
      .trim()
      .split('\n')
      .filter(line => line.length > 0);
    
    if (stagedFiles.length === 0) {
      console.log('No staged changes to check.');
      process.exit(0);
    }
    
    // Get staged changes
    const changes = getStagedChanges();
    
    // Scan for markers
    const allMarkers: DebtMarker[] = [];
    for (const [file, changedLines] of changes.entries()) {
      // Only scan source files (not test files, config files, etc.)
      if (file.match(/\.(ts|js|tsx|jsx)$/) && !file.match(/\.(spec|test)\.(ts|js)$/)) {
        const markers = scanFileForMarkers(file, changedLines);
        allMarkers.push(...markers);
      }
    }
    
    // If markers found, block commit
    if (allMarkers.length > 0) {
      const register = generateDebtRegister(allMarkers);
      console.error(register);
      
      // Save marker data for remediation script
      const markerDataPath = join(process.cwd(), '.debt-markers.json');
      writeFileSync(markerDataPath, JSON.stringify(allMarkers, null, 2));
      
      process.exit(1);
    }
    
    console.log('✅ No debt markers found in staged changes.');
    process.exit(0);
  } catch (error) {
    console.error('Error during debt marker check:', error);
    process.exit(1);
  }
}

// Run if executed directly
// Check if this script is being run directly (not imported)
const isMainModule = 
  (typeof require !== 'undefined' && require.main === module) ||
  (process.argv[1]?.includes('debt-marker-check') ?? false);

if (isMainModule) {
  main();
}

export { getStagedChanges, scanFileForMarkers, generateDebtRegister, getMarkerContext, generateFixPrompt };
export type { DebtMarker };

