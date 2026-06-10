// Distinct, accessible colors for soldier identification
// Each color has good contrast with white text
export const SOLDIER_COLORS = [
  "#EF4444", // red
  "#F97316", // orange
  "#F59E0B", // amber
  "#EAB308", // yellow
  "#84CC16", // lime
  "#22C55E", // green
  "#10B981", // emerald
  "#14B8A6", // teal
  "#06B6D4", // cyan
  "#0EA5E9", // sky
  "#3B82F6", // blue
  "#6366F1", // indigo
  "#8B5CF6", // violet
  "#A855F7", // purple
  "#D946EF", // fuchsia
  "#EC4899", // pink
  "#F43F5E", // rose
  "#78716C", // stone
  "#525B6D", // slate
  "#65A30D", // dark lime
  "#7C3AED", // dark violet
  "#0891B2", // dark cyan
  "#BE123C", // dark rose
  "#15803D", // dark green
  "#1D4ED8", // dark blue
  "#9333EA", // dark purple
  "#C2410C", // dark orange
  "#A16207", // dark yellow
  "#0F766E", // dark teal
  "#9F1239", // darker rose
] as const;

export function getColorForIndex(index: number): string {
  return SOLDIER_COLORS[index % SOLDIER_COLORS.length];
}

/**
 * Returns appropriate text color (black or white) for given background hex color.
 */
export function getContrastText(hexColor: string): "white" | "black" {
  const hex = hexColor.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  // YIQ formula
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 150 ? "black" : "white";
}
