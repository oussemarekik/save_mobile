export function isOfferExpired(expirationDate?: string): boolean {
  if (!expirationDate) return false;
  return new Date(expirationDate).getTime() <= Date.now();
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
