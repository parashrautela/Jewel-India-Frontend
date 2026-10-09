import { supabaseAdmin } from "../../../lib/supabase/admin.js";
import { UUID } from "../../../lib/wishlist/contract.mjs";
import { authorizedMutation, failure, reply, storeForRequest } from "../../../lib/wishlist/server.js";

const productFields = "id, title, jewellery_type, net_weight, showcase_image_urls, generated_image_urls, processed_image_url";

export async function GET(request) {
  try {
    const scope = await storeForRequest(request);
    if (scope.response) return scope.response;
    const url = new URL(request.url);
    if (url.searchParams.get("catalogue") === "1") {
      const search = (url.searchParams.get("q") ?? "").trim().slice(0, 80);
      let query = supabaseAdmin.from("products").select(productFields).eq("is_published", true).order("created_at", { ascending: false }).limit(60);
      if (search) query = query.ilike("title", `%${search.replace(/[%_]/g, "")}%`);
      const { data, error } = await query;
      return error ? failure("UNAVAILABLE", 503) : reply({ ok: true, products: data });
    }
    const { data: customers, error } = await supabaseAdmin.from("retailer_customers")
      .select("id, name, customer_boards(id, title, customer_board_items(product_id))")
      .eq("retailer_id", scope.storeId).order("created_at", { ascending: false }).limit(200);
    if (error) return failure("UNAVAILABLE", 503);
    const ids = [...new Set(customers.flatMap(c => c.customer_boards.flatMap(b => b.customer_board_items.map(i => i.product_id))))];
    const products = [];
    // Keep each query within API URL limits when a store has many board items.
    for (let i = 0; i < ids.length; i += 100) {
      const { data, error: productError } = await supabaseAdmin.from("products").select(productFields).eq("is_published", true).in("id", ids.slice(i, i + 100));
      if (productError) return failure("UNAVAILABLE", 503);
      products.push(...data);
    }
    return reply({ ok: true, customers, products });
  } catch { return failure("UNAVAILABLE", 503); }
}

export async function POST(request) {
  if (!authorizedMutation(request)) return failure("FORBIDDEN", 403);
  try {
    const scope = await storeForRequest(request);
    if (scope.response) return scope.response;
    const body = await request.json();
    let query;
    if (body.action === "add_customer") {
      const name = typeof body.name === "string" ? body.name.trim() : "";
      if (!name || name.length > 120) return failure("INVALID_SETTINGS");
      query = supabaseAdmin.from("retailer_customers").insert({ retailer_id: scope.storeId, created_by: scope.user.id, name });
    } else if (body.action === "add_board") {
      const title = typeof body.title === "string" ? body.title.trim() : "";
      if (!UUID.test(body.customer_id ?? "") || !title || title.length > 80) return failure("INVALID_SETTINGS");
      const { data, error } = await supabaseAdmin.from("retailer_customers").select("id").eq("id", body.customer_id).eq("retailer_id", scope.storeId).maybeSingle();
      if (error || !data) return failure("NOT_FOUND", 404);
      query = supabaseAdmin.from("customer_boards").insert({ customer_id: data.id, retailer_id: scope.storeId, title });
    } else if (body.action === "set_design") {
      if (!UUID.test(body.board_id ?? "") || !UUID.test(body.product_id ?? "") || typeof body.saved !== "boolean") return failure("INVALID_SETTINGS");
      const { data, error } = await supabaseAdmin.from("customer_boards").select("id").eq("id", body.board_id).eq("retailer_id", scope.storeId).maybeSingle();
      if (error || !data) return failure("NOT_FOUND", 404);
      if (body.saved) {
        const { data: product } = await supabaseAdmin.from("products").select("id").eq("id", body.product_id).eq("is_published", true).maybeSingle();
        if (!product) return failure("NOT_FOUND", 404);
        query = supabaseAdmin.from("customer_board_items").upsert({ board_id: data.id, product_id: body.product_id, retailer_id: scope.storeId }, { onConflict: "board_id,product_id", ignoreDuplicates: true });
      } else {
        query = supabaseAdmin.from("customer_board_items").delete().eq("board_id", data.id).eq("product_id", body.product_id).eq("retailer_id", scope.storeId);
      }
    } else { return failure("INVALID_SETTINGS"); }
    const { error } = await query;
    return error ? failure("UNAVAILABLE", 503) : reply({ ok: true });
  } catch { return failure("UNAVAILABLE", 503); }
}
