import { TOKEN, UUID } from "../../../lib/wishlist/contract.mjs";
import { failure, hashToken, rpc, sessionCookie, resultResponse } from "../../../lib/wishlist/server.js";

import { withCatalogueImages } from "../../../lib/wishlist/catalogue-content.js";

export async function GET(request) {
  try {
    const id = new URL(request.url).searchParams.get("session");
    if (!UUID.test(id ?? "")) return failure("UNAVAILABLE", 404);
    const session = request.cookies.get(sessionCookie(id))?.value;
    if (!TOKEN.test(session ?? "")) return failure("SESSION_ENDED", 410);
    const result = await rpc("wishlist_share_content", { p_session_hash: hashToken(session) });
    return resultResponse(await withCatalogueImages(result));
  } catch { return failure("UNAVAILABLE", 503); }
}
