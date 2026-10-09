/**
 * The database raises short tokens (INVITE_CODE_EXPIRED, NOT_INVITED, …) so
 * every client can show its own wording. These are the website's sentences.
 *
 * validate_referral_code() returns lower-case reasons instead of raising;
 * they share the same wording.
 */
export const DB_MESSAGES = {
  INVITE_CODE_REQUIRED: "Enter your invitation code.",
  INVITE_CODE_NOT_FOUND: "We couldn't find that code. Check it with the wholesaler who invited you.",
  INVITE_CODE_EXPIRED: "This invitation has expired. Ask the wholesaler for a new one.",
  INVITE_CODE_USED: "This invitation has already been used.",
  INVITE_CODE_INACTIVE: "This invitation isn't active any more.",
  NOT_INVITED: "This Google account isn't on any store's staff list yet. Ask your store owner to add it.",
  ACCOUNT_HAS_ANOTHER_ROLE: "This Google account already belongs to a wholesaler or retailer.",
  GOOGLE_SIGN_IN_REQUIRED: "Staff invited by email sign in with Google.",
  RETAILER_HAS_NO_INVITER: "This retailer hasn't entered an invitation code yet.",
  RETAILER_ALREADY_ATTRIBUTED: "This account already has an inviter.",
  RETAILER_ALREADY_VERIFIED: "This account is already verified.",
  RETAILER_NOT_FOUND: "We couldn't find your retailer application.",
  ROLE_ALREADY_SET: "This account is already set up as something else.",
  ROLE_NOT_ALLOWED: "Staff accounts are created by the store, not chosen.",
  CANNOT_DELETE_STORE_OWNER_ROW: "The store owner's own row can't be removed.",
  USE_STAFF_ACCOUNTS_SERVICE: "Staff logins are created from the employees page.",
  NOT_SIGNED_IN: "Please sign in again.",
};

const INVITE_REASONS = {
  no_code: DB_MESSAGES.INVITE_CODE_REQUIRED,
  not_found: DB_MESSAGES.INVITE_CODE_NOT_FOUND,
  expired: DB_MESSAGES.INVITE_CODE_EXPIRED,
  used: DB_MESSAGES.INVITE_CODE_USED,
  inactive: DB_MESSAGES.INVITE_CODE_INACTIVE,
};

/**
 * A sentence for a Postgres error whose message is (or contains) a known
 * token. Anything else gets the fallback.
 */
export function messageForDbError(error, fallback = "Something went wrong. Please try again.") {
  const text = typeof error === "string" ? error : error?.message || "";
  const token = Object.keys(DB_MESSAGES).find((key) => text.includes(key));
  return token ? DB_MESSAGES[token] : fallback;
}

/** A sentence for a validate_referral_code() reason. */
export function messageForInviteReason(reason) {
  return INVITE_REASONS[reason] || "This invitation can't be used.";
}
