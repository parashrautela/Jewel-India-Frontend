import { timingSafeEqual } from "crypto";

/**
 * The /api/admin routes are called by the admin panel with a shared secret
 * in the x-admin-password header. ADMIN_API_PASSWORD is server-only; while
 * it is unset nothing gets through.
 */
export function isAdminRequest(request) {
  const expected = process.env.ADMIN_API_PASSWORD;
  if (!expected) return false;

  const given = request.headers.get("x-admin-password") || "";
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
