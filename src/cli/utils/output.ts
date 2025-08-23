/**
 * Common CLI output utilities and formatters
 * Shared across different command modules
 */

import pc from "picocolors";

/**
 * Format error messages consistently
 */
export function formatError(message: string): string {
  return pc.red(`Error: ${message}`);
}

/**
 * Format success messages consistently
 */
export function formatSuccess(message: string): string {
  return pc.green(message);
}

/**
 * Format warning messages consistently
 */
export function formatWarning(message: string): string {
  return pc.yellow(`Warning: ${message}`);
}

/**
 * Output JSON with consistent formatting
 */
export function outputJson(data: any): void {
  process.stdout.write(JSON.stringify(data, null, 2) + "\n");
}

/**
 * Log error and set exit code
 */
export function exitWithError(message: string, exitCode: number = 1): void {
  console.error(formatError(message));
  process.exitCode = exitCode;
}

/**
 * Format table-like output with consistent spacing
 */
export function formatTable(rows: Array<{ [key: string]: string | number }>): void {
  if (rows.length === 0) return;
  
  const keys = Object.keys(rows[0]);
  const columnWidths = keys.map(key => 
    Math.max(key.length, ...rows.map(row => String(row[key]).length))
  );
  
  rows.forEach(row => {
    const formatted = keys.map((key, i) => 
      String(row[key]).padEnd(columnWidths[i])
    ).join('\t');
    console.log(formatted);
  });
}