// Capability links and customer wishlist data must never enter telemetry payloads.
export function containsWishlistData(value) {
  let text;
  try { text = typeof value === "string" ? value : JSON.stringify(value); }
  catch { return true; }
  return /\/(?:share\/(?:wishlist|catalogue)|api\/(?:shared-wishlist|wishlist-shares|wishlists|catalogue-shares))(?:[\/?#\s"']|$)/.test(text ?? "");
}
export const filterWishlistTelemetry = event => containsWishlistData(event) ? null : event;
