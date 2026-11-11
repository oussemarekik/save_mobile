import { dateForDayOffset, dayOffsetOf, timeTextOf } from "@/utils/offerUtils";

type Translate = (key: string, params?: Record<string, string | number>) => string;

/** "Aujourd'hui", "Demain", or a short date such as "ven. 13 nov." */
export function pickupDayLabel(dayOffset: number, t: Translate, language: string): string {
  if (dayOffset === 0) return t("provider_offers.today");
  if (dayOffset === 1) return t("provider_offers.tomorrow");
  return dateForDayOffset(dayOffset).toLocaleDateString(language === "fr" ? "fr-FR" : "en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

/** "Aujourd'hui · 17:00 – 19:00" for an offer's pickup window, or "" when it has none. */
export function pickupWindowLabel(
  offer: { pickupStartTime?: string | null; pickupEndTime?: string | null },
  t: Translate,
  language: string
): string {
  if (!offer.pickupStartTime || !offer.pickupEndTime) return "";
  const start = new Date(offer.pickupStartTime);
  const end = new Date(offer.pickupEndTime);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return "";
  return `${pickupDayLabel(dayOffsetOf(start), t, language)} · ${timeTextOf(start)} – ${timeTextOf(end)}`;
}
