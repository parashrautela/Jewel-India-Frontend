import { TOKEN } from "../../../../lib/wishlist/contract.mjs";
import { browserCookie, cookieOptions, failure, hashToken, newToken, rateLimit, reply, rpc, sameOrigin, sessionCookie, resultResponse } from "../../../../lib/wishlist/server.js";

export async function POST(request) {
  if (!sameOrigin(request)) return failure("FORBIDDEN", 403);
  const browser = request.cookies.get(browserCookie)?.value;
  if (!TOKEN.test(browser ?? "")) return failure("SESSION_REQUIRED", 400);
  try {
    if (!(await rateLimit(request, browser))) return failure("RATE_LIMITED", 429);
    const { token } = await request.json();
    if (!TOKEN.test(token ?? "")) return failure("UNAVAILABLE", 404);
    const session = newToken();
    const result = await rpc("wishlist_share_claim", { p_token_hash: hashToken(token),
      p_browser_hash: hashToken(browser), p_session_hash: hashToken(session) });
    if (!result?.ok) return resultResponse(result);
    const response = reply(result);
    response.cookies.set(sessionCookie(result.share_id), session, { ...cookieOptions,
      maxAge: Math.max(1, Math.floor((Date.parse(result.expires_at) - Date.parse(result.server_now)) / 1000)) });
    return response;
  } catch { return failure("UNAVAILABLE", 503); }
}
