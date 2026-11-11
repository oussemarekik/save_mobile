export function isOfferExpired(expirationDate?: string): boolean {
  if (!expirationDate) return false;
  return new Date(expirationDate).getTime() <= Date.now();
}

export type OfferStatus = "active" | "sold_out" | "expired";

export function getOfferStatus(offer: { expirationDate?: string; quantity?: number }): OfferStatus {
  if (isOfferExpired(offer.expirationDate)) return "expired";
  return (offer.quantity ?? 0) > 0 ? "active" : "sold_out";
}

// ─── Prices ────────────────────────────────────────────────────────────────────

/** The API adds a 13% commission to the provider's price and rounds to 0.1 dt. */
const COMMISSION_MULTIPLIER = 1.13;

/** Price clients pay for a given provider price, computed like the API does. */
export function customerPriceFor(providerPrice: number): number {
  return Math.round(providerPrice * COMMISSION_MULTIPLIER * 10) / 10;
}

/** Provider price behind a stored price, which already includes the commission. */
export function providerPriceFrom(customerPrice: number): number {
  const rounded = Math.round((customerPrice / COMMISSION_MULTIPLIER) * 10) / 10;
  if (customerPriceFor(rounded) === customerPrice) return rounded;
  return Math.round((customerPrice / COMMISSION_MULTIPLIER) * 100) / 100;
}

/** Reads an amount typed with a dot or a comma ("4,5"). Null when it is not a positive amount. */
export function parseAmount(text: string): number | null {
  const normalized = text.trim().replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  const amount = parseFloat(normalized);
  return amount > 0 ? amount : null;
}

export function discountPercent(price: number, originalPrice?: number | null): number | null {
  if (!originalPrice || originalPrice <= price) return null;
  return Math.round(((originalPrice - price) / originalPrice) * 100);
}

// ─── Pickup windows ────────────────────────────────────────────────────────────

const MINUTES_PER_DAY = 24 * 60;

function toTimeText(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

/** Minutes since midnight for "17:00", "17h30", "17h", "9" or "930". Null when it is not a time. */
export function parseTimeText(text: string): number | null {
  const match = text.trim().match(/^(\d{1,2})\s*(?:[:h.]\s*)?(\d{2})?$/i);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2] ?? 0);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

/** "17h30" → "17:30". Returns the text unchanged when it is not a time. */
export function normalizeTimeText(text: string): string {
  const minutes = parseTimeText(text);
  return minutes === null ? text : toTimeText(minutes);
}

/** Moves a time by a number of minutes, staying within the same day. */
export function shiftTimeText(text: string, deltaMinutes: number, fallback: string): string {
  const current = parseTimeText(text) ?? parseTimeText(fallback) ?? 0;
  const shifted = Math.min(Math.max(current + deltaMinutes, 0), MINUTES_PER_DAY - 15);
  return toTimeText(shifted);
}

export function timeTextOf(date: Date): string {
  return toTimeText(date.getHours() * 60 + date.getMinutes());
}

function startOfDay(date: Date): Date {
  const day = new Date(date);
  day.setHours(0, 0, 0, 0);
  return day;
}

/** Whole days between today and a date: 0 today, 1 tomorrow, negative in the past. */
export function dayOffsetOf(date: Date, now: Date = new Date()): number {
  // Rounding absorbs the 23h/25h days around daylight-saving changes
  return Math.round((startOfDay(date).getTime() - startOfDay(now).getTime()) / 86_400_000);
}

export function dateForDayOffset(dayOffset: number, now: Date = new Date()): Date {
  const day = startOfDay(now);
  day.setDate(day.getDate() + dayOffset);
  return day;
}

export type PickupSlot = { dayOffset: number; startTime: string; endTime: string };

/** Start and end of a slot as dates, or null when a time is unreadable. */
export function pickupWindowFor(slot: PickupSlot, now: Date = new Date()): { start: Date; end: Date } | null {
  const startMinutes = parseTimeText(slot.startTime);
  const endMinutes = parseTimeText(slot.endTime);
  if (startMinutes === null || endMinutes === null) return null;
  const start = dateForDayOffset(slot.dayOffset, now);
  start.setMinutes(startMinutes);
  const end = dateForDayOffset(slot.dayOffset, now);
  end.setMinutes(endMinutes);
  return { start, end };
}

/**
 * First slot still ahead of us for the given times: today while the window has
 * not closed, otherwise tomorrow. Defaults to an early-evening pickup.
 */
export function nextPickupSlot(
  times: { startTime: string; endTime: string } = { startTime: "17:00", endTime: "19:00" },
  now: Date = new Date()
): PickupSlot {
  const today = pickupWindowFor({ dayOffset: 0, ...times }, now);
  const stillOpenToday = !!today && today.end.getTime() > now.getTime();
  return { dayOffset: stillOpenToday ? 0 : 1, ...times };
}

export type OfferFilter = "all" | "active" | "expired" | "low_stock";

export function filterOffers<T extends { expirationDate?: string; quantity?: number; title?: string; description?: string; pickupLocation?: string }>(
  offers: T[],
  searchQuery: string,
  filter: OfferFilter
): T[] {
  let result = [...offers];

  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    result = result.filter(
      (o) =>
        o.title?.toLowerCase().includes(q) ||
        o.description?.toLowerCase().includes(q) ||
        o.pickupLocation?.toLowerCase().includes(q)
    );
  }

  if (filter === "active") {
    result = result.filter((o) => !isOfferExpired(o.expirationDate) && (o.quantity ?? 0) > 0);
  } else if (filter === "expired") {
    result = result.filter((o) => isOfferExpired(o.expirationDate));
  } else if (filter === "low_stock") {
    result = result.filter((o) => !isOfferExpired(o.expirationDate) && (o.quantity ?? 0) > 0 && (o.quantity ?? 0) <= 5);
  }

  return result.sort((a, b) => {
    const aExpired = isOfferExpired(a.expirationDate);
    const bExpired = isOfferExpired(b.expirationDate);
    if (aExpired !== bExpired) return aExpired ? 1 : -1;
    return new Date(b.expirationDate || 0).getTime() - new Date(a.expirationDate || 0).getTime();
  });
}

export function getOfferStats(offers: { expirationDate?: string; quantity?: number }[]) {
  return {
    total: offers.length,
    active: offers.filter((o) => !isOfferExpired(o.expirationDate) && (o.quantity ?? 0) > 0).length,
    expired: offers.filter((o) => isOfferExpired(o.expirationDate)).length,
    lowStock: offers.filter((o) => !isOfferExpired(o.expirationDate) && (o.quantity ?? 0) > 0 && (o.quantity ?? 0) <= 5).length,
  };
}
