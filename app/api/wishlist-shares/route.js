import { supabaseAdmin } from "../../../lib/supabase/admin.js";
import { UUID, validShareSettings } from "../../../lib/wishlist/contract.mjs";
import { authorizedMutation, failure, hashToken, newToken, reply, rpc, storeForRequest } from "../../../lib/wishlist/server.js";

export async function GET(request) {
  try {
    const scope = await storeForRequest(request);
    if (scope.response) return scope.response;
    const board = new URL(request.url).searchParams.get("board_id");
    if (!UUID.test(board ?? "")) return failure("INVALID_SETTINGS");
    const { data, error } = await supabaseAdmin.from("wishlist_shares")
      .select("id, board_id, max_viewers, views_used, created_at, expires_at, revoked_at")
      .eq("retailer_id", scope.storeId).eq("board_id", board).order("created_at", { ascending: false }).limit(50);
    if (error) return failure("UNAVAILABLE", 503);
    return reply({ ok: true, shares: data, server_now: new Date().toISOString() });
  } catch { return failure("UNAVAILABLE", 503); }
}

export async function POST(request) {
  if (!authorizedMutation(request)) return failure("FORBIDDEN", 403);
  try {
    const scope = await storeForRequest(request);
    if (scope.response) return scope.response;
    const body = await request.json();
    if (!validShareSettings(body)) return failure("INVALID_SETTINGS");
    if (!(await rpc("wishlist_share_rate_limit", { p_bucket: `creator:${scope.user.id}`, p_limit: 12 }))) return failure("RATE_LIMITED", 429);
    const token = newToken();
    const result = await rpc("wishlist_share_create", { p_actor: scope.user.id,
      p_board: body.board_id, p_token_hash: hashToken(token), p_max_viewers: body.max_viewers,
      p_duration_minutes: body.duration_minutes });
    if (!result?.ok) return failure(result?.error ?? "UNAVAILABLE", 400);
    // The origin is supplied by the client's trusted app location, not request Host.
    return reply({ ...result, link_path: `/share/wishlist#${token}` }, 201);
  } catch (error) { return failure("UNAVAILABLE", error instanceof SyntaxError ? 400 : 503); }
}
