import { catalogueShareProblem } from "../../../lib/wishlist/contract.mjs";
import { authorizedMutation, catalogueFailure, hashToken, newToken, reply, rpc, wholesalerForRequest } from "../../../lib/wishlist/server.js";

// A wholesaler's own catalogue links (plans/catalogue-sharing/CONTRACT.md §3.2).
export async function GET(request) {
  try {
    const scope = await wholesalerForRequest(request);
    if (scope.response) return scope.response;
    const shares = await rpc("catalogue_share_list", { p_actor: scope.user.id });
    return reply({ ok: true, shares: Array.isArray(shares) ? shares : [], server_now: new Date().toISOString() });
  } catch { return catalogueFailure("UNAVAILABLE", 503); }
}

// Creates a link to a hand-picked set of the caller's published designs (CONTRACT.md §3.1).
export async function POST(request) {
  if (!authorizedMutation(request)) return catalogueFailure("FORBIDDEN", 403);
  try {
    const scope = await wholesalerForRequest(request);
    if (scope.response) return scope.response;
    const body = await request.json();
    const problem = catalogueShareProblem(body);
    if (problem) return catalogueFailure(problem);
    if (!(await rpc("wishlist_share_rate_limit", { p_bucket: `catalogue-creator:${scope.user.id}`, p_limit: 12 }))) {
      return catalogueFailure("RATE_LIMITED", 429);
    }
    const token = newToken();
    const result = await rpc("catalogue_share_create", { p_actor: scope.user.id, p_products: body.product_ids,
      p_title: typeof body.title === "string" ? body.title : null, p_token_hash: hashToken(token),
      p_max_viewers: body.max_viewers, p_duration_minutes: body.duration_minutes });
    if (!result?.ok) return catalogueFailure(result?.error ?? "UNAVAILABLE", result?.error === "NOT_VERIFIED" ? 403 : 400);
    // The secret leaves the server exactly once, in the fragment so it never reaches request logs.
    return reply({ ...result, link_path: `/share/catalogue#${token}` }, 201);
  } catch (error) { return catalogueFailure(error instanceof SyntaxError ? "INVALID_SETTINGS" : "UNAVAILABLE", error instanceof SyntaxError ? 400 : 503); }
}
