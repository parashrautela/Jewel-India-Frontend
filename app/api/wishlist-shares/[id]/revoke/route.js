import { UUID } from "../../../../../lib/wishlist/contract.mjs";
import { authorizedMutation, failure, rpc, storeForRequest, resultResponse } from "../../../../../lib/wishlist/server.js";

export async function POST(request, { params }) {
  if (!authorizedMutation(request)) return failure("FORBIDDEN", 403);
  try {
    const scope = await storeForRequest(request);
    if (scope.response) return scope.response;
    const { id } = await params;
    if (!UUID.test(id)) return failure("NOT_FOUND", 404);
    return resultResponse(await rpc("wishlist_share_revoke", { p_actor: scope.user.id, p_share: id }));
  } catch { return failure("UNAVAILABLE", 503); }
}
