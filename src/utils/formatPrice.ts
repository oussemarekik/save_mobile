/** App currency is Tunisian dinars. Keep display unit identical everywhere. */
export const CURRENCY_CODE = "TND";
export const CURRENCY_UNIT = "dt";

/** Format a full price label, e.g. "5.10 dt". */
export function formatPrice(amount: number): string {
  return `${formatPriceValue(amount)} ${CURRENCY_UNIT}`;
}

/** Numeric amount only (no unit) — for inputs or when the unit is shown separately. */
export function formatPriceValue(amount: number): string {
  return Number(amount).toFixed(2);
}
