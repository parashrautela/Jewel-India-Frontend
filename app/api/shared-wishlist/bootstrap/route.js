import { TOKEN } from "../../../../lib/wishlist/contract.mjs";
import { browserCookie, cookieOptions, failure, newToken, reply } from "../../../../lib/wishlist/server.js";

export async function GET(request) {
  if (request.headers.get("sec-fetch-site") === "cross-site") return failure("FORBIDDEN", 403);
  const existing = request.cookies.get(browserCookie)?.value;
  const response = reply({ ok: true });
  if (!TOKEN.test(existing ?? "")) {
    response.cookies.set(browserCookie, newToken(), { ...cookieOptions, maxAge: 60 * 60 * 24 * 30 });
  }
  return response;
}
