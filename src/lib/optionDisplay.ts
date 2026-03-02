/** Option label format: alpha (A, B, C...) or numeric (1, 2, 3...) */
export type OptionDisplayFormat = 'alpha' | 'numeric';

/**
 * Get the display label for an option by index.
 * - alpha: A, B, C, ... Z, then 27, 28, ... for 26+
 * - numeric: 1, 2, 3, 4, ...
 */
export function getOptionLabel(index: number, format: OptionDisplayFormat = 'alpha'): string {
  if (format === 'numeric') {
    return String(index + 1);
  }
  if (index < 26) {
    return String.fromCharCode(65 + index);
  }
  return String(index + 1);
}

/** Format option for display: "A. Option text" or "1. Option text" */
export function formatOptionLabel(index: number, optionText: string, format: OptionDisplayFormat = 'alpha'): string {
  const label = getOptionLabel(index, format);
  return `${label}. ${optionText}`;
}
