import { UUID } from "../../../../../lib/wishlist/contract.mjs";
import { authorizedMutation, catalogueFailure, reply, rpc, wholesalerForRequest } from "../../../../../lib/wishlist/server.js";

// Owner-only and idempotent (plans/catalogue-sharing/CONTRACT.md §3.3).
export async function POST(request, { params }) {
  if (!authorizedMutation(request)) return catalogueFailure("FORBIDDEN", 403);
  try {
    const scope = await wholesalerForRequest(request);
    if (scope.response) return scope.response;
    const { id } = await params;
    if (!UUID.test(id ?? "")) return catalogueFailure("NOT_FOUND", 404);
    const result = await rpc("catalogue_share_revoke", { p_actor: scope.user.id, p_share: id });
    if (result?.ok) return reply({ ok: true });
    return catalogueFailure(result?.error ?? "UNAVAILABLE", result?.error === "NOT_FOUND" ? 404 : 400);
  } catch { return catalogueFailure("UNAVAILABLE", 503); }
}
