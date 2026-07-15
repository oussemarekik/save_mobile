/** Format price in Tunisian dinars (dt) — matches web frontend */
export function formatPrice(amount: number): string {
  return `${Number(amount).toFixed(2)} dt`;
}

export function formatPriceValue(amount: number): string {
  return Number(amount).toFixed(2);
}
