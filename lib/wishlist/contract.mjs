export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const TOKEN = /^[a-f0-9]{64}$/;
export const SHARE_MESSAGES = {
  EXPIRED: "This wishlist link has expired.",
  FULL: "All viewing slots for this link have been used.",
  SESSION_ENDED: "Your viewing session has ended. Ask the store for a new link.",
  UNAVAILABLE: "This wishlist is no longer available.",
  EMPTY_WISHLIST: "Add a published design to this wishlist before sharing.",
  NOT_VERIFIED: "A verified store and active account are required.",
  NOT_FOUND: "Wishlist not found.",
  INVALID_SETTINGS: "Choose 1–100 viewers and a validity between 5 minutes and 7 days.",
  TOO_MANY_LINKS: "Revoke an unused link before creating another.",
  RATE_LIMITED: "Too many attempts. Please wait a minute and try again.",
  UNAUTHORIZED: "Please sign in again.",
};

// Wholesaler catalogue links (plans/catalogue-sharing/CONTRACT.md §4). The apps show these as-is.
export const CATALOGUE_MESSAGES = {
  ...SHARE_MESSAGES,
  UNAUTHORIZED: "Please sign in again to share designs.",
  NOT_VERIFIED: "Sharing is available once your wholesaler account is verified.",
  INVALID_SELECTION: "Select 1–50 of your published designs.",
  NOT_FOUND: "Link not found.",
  UNAVAILABLE: "Sharing is temporarily unavailable. Please try again.",
};
export const CATALOGUE_LINK = /^\/share\/catalogue#[a-f0-9]{64}$/;
export const MAX_CATALOGUE_ITEMS = 50;

// Distinguishes a bad selection from bad link settings so the apps can say which.
export function catalogueShareProblem(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return "INVALID_SETTINGS";
  const ids = body.product_ids;
  if (!Array.isArray(ids) || ids.length < 1 || ids.length > MAX_CATALOGUE_ITEMS ||
    !ids.every(id => typeof id === "string" && UUID.test(id)) ||
    new Set(ids.map(id => id.toLowerCase())).size !== ids.length) return "INVALID_SELECTION";
  if (!Number.isInteger(body.max_viewers) || body.max_viewers < 1 || body.max_viewers > 100 ||
    !Number.isInteger(body.duration_minutes) || body.duration_minutes < 5 || body.duration_minutes > 10080) return "INVALID_SETTINGS";
  if (body.title != null && (typeof body.title !== "string" || body.title.length > 500)) return "INVALID_SETTINGS";
  return null;
}

export function validShareSettings(body) {
  return UUID.test(body?.board_id ?? "") &&
    Number.isInteger(body?.max_viewers) && body.max_viewers >= 1 && body.max_viewers <= 100 &&
    Number.isInteger(body?.duration_minutes) && body.duration_minutes >= 5 && body.duration_minutes <= 10080;
}

export function remainingSessionMs(expiresAt, serverNow, receivedAt, now = Date.now()) {
  const duration = Date.parse(expiresAt) - Date.parse(serverNow);
  if (!Number.isFinite(duration)) return 0;
  return Math.max(0, duration - Math.max(0, now - receivedAt));
}

export function safeImageUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.href : null;
  } catch { return null; }
}

// Deployment gateways can return HTML. Never expose parser errors to guests.
export async function wishlistResponse(response) {
  let data;
  try { data = await response.json(); }
  catch { throw new Error("Wishlist sharing is temporarily unavailable. Please try again."); }
  if (!response.ok) throw new Error(typeof data?.message === "string" ? data.message : "Wishlist sharing is temporarily unavailable. Please try again.");
  if (!data || typeof data !== "object") throw new Error("Wishlist sharing is temporarily unavailable. Please try again.");
  return data;
}
