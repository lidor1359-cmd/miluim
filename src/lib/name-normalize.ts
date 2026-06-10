/**
 * נירמול שם עברי להשוואה נסבלת.
 * - מתעלם מרווחים מובילים/סוגרים
 * - מצמצם רווחים כפולים לרווח יחיד
 * - מנרמל אותיות סופיות (ם↔מ, ן↔נ, ץ↔צ, ף↔פ, ך↔כ)
 */
export function normalizeName(s: string): string {
  return s
    .trim()
    .replace(/\s+/g, " ")
    .replace(/ם/g, "מ")
    .replace(/ן/g, "נ")
    .replace(/ץ/g, "צ")
    .replace(/ף/g, "פ")
    .replace(/ך/g, "כ");
}
