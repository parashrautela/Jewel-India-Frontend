import "server-only";
import { createHash, createHmac, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "../supabase/admin.js";
import { getRequestUser } from "../supabase/request-user.js";
import { SHARE_MESSAGES } from "./contract.mjs";

export const privateHeaders = {
  "Cache-Control": "private, no-store, max-age=0",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
  "Referrer-Policy": "no-referrer",
};
export const browserCookie = "ji_wishlist_browser";
export const cookieOptions = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/api/shared-wishlist" };
export const newToken = () => randomBytes(32).toString("hex");
export const hashToken = (token) => createHash("sha256").update(token).digest("hex");
export const sessionCookie = (id) => `ji_wishlist_${id}`;

export function reply(body, status = 200) {
  return NextResponse.json(body, { status, headers: privateHeaders });
}
export function failure(code, status = 400) {
  return reply({ ok: false, error: code, message: SHARE_MESSAGES[code] ?? "Wishlists are unavailable right now. Please try again." }, status);
}
export function sameOrigin(request) {
  const origin = request.headers.get("origin");
  return origin === new URL(request.url).origin;
}
export function authorizedMutation(request) {
  // Bearer clients are authenticated separately and aren't vulnerable to cookie CSRF.
  return /^Bearer\s+\S+$/i.test(request.headers.get("authorization") ?? "") || sameOrigin(request);
}
export async function rpc(name, args) {
  const { data, error } = await supabaseAdmin.rpc(name, args);
  if (error) {
    // Avoid logging request URLs, capability tokens, RPC arguments, or customer data.
    console.error(`[wishlist] ${name} failed`, { code: error.code });
    throw new Error("WISHLIST_UNAVAILABLE");
  }
  return data;
}
export async function storeForRequest(request) {
  const { user, error } = await getRequestUser(request);
  if (error || !user) return { response: failure("UNAUTHORIZED", 401) };
  const storeId = await rpc("wishlist_actor_store", { p_actor: user.id });
  if (!storeId) return { response: failure("NOT_VERIFIED", 403) };
  return { user, storeId };
}
export async function rateLimit(request, browser) {
  const ip = (request.headers.get("x-forwarded-for") ?? "unknown").split(",")[0].trim();
  const bucket = createHmac("sha256", process.env.SUPABASE_SERVICE_ROLE_KEY)
    .update(`wishlist-ip:${ip}`).digest("hex");
  const byIP = await rpc("wishlist_share_rate_limit", { p_bucket: bucket, p_limit: 60 });
  const byBrowser = await rpc("wishlist_share_rate_limit", { p_bucket: `browser:${hashToken(browser)}`, p_limit: 12 });
  return byIP && byBrowser;
}
export function resultResponse(result) {
  if (result?.ok) return reply(result);
  const status = result?.error === "NOT_FOUND" ? 404 : result?.error === "NOT_VERIFIED" ? 403 : 410;
  return failure(result?.error ?? "UNAVAILABLE", status);
}
