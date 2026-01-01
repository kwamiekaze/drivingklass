/**
 * Format price for chip display (removes .00 decimals)
 * Examples:
 * - $69.00 → $69
 * - $1,099.00 → $1,099
 * - $499.99 → $499.99 (keeps non-.00 decimals)
 */
export function formatChipPrice(priceString: string): string {
  // Remove .00 at the end if present
  return priceString.replace(/\.00$/, '');
}

/**
 * Format price for full display (keeps all decimals as-is)
 * Used for Selected Package area and modals
 */
export function formatFullPrice(priceString: string): string {
  return priceString;
}
