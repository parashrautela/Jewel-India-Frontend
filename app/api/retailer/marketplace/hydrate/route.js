import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../../lib/supabase/admin.js";
import { getRequestUser } from "../../../../../lib/supabase/request-user.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CARD_FIELDS = `
  id, title, jewellery_type, category, style, size,
  stock_available, make_to_order_days, metal_purity, net_weight,
  gross_weight, stone_weight, raw_image_url, processed_image_url,
  image_url, generated_image_urls, showcase_image_urls, image_variants,
  is_published, created_at
`;

/**
 * Batch authorized hydration for image-search match IDs or external lists.
 * Enforces verified retailer authentication, filters only published products,
 * preserves caller's ranked order, and caps batch size at 50.
 */
export async function POST(request) {
  try {
    const { user, error: authError } = await getRequestUser(request);
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.user_metadata?.role !== "retailer") {
      return NextResponse.json({ error: "Retailer access required" }, { status: 403 });
    }

    const { data: retailer, error: retailerError } = await supabaseAdmin
      .from("retailers")
      .select("id, verification_status")
      .eq("user_id", user.id)
      .single();

    if (retailerError || !retailer) {
      return NextResponse.json({ error: "Retailer profile not found" }, { status: 404 });
    }
    if (retailer.verification_status !== "verified") {
      return NextResponse.json({ error: "Retailer verification is required" }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    if (!body || !Array.isArray(body.product_ids)) {
      return NextResponse.json({ error: "product_ids must be an array" }, { status: 400 });
    }

    const requestedIDs = body.product_ids
      .filter((id) => typeof id === "string" && id.trim().length > 0)
      .slice(0, 50);

    if (requestedIDs.length === 0) {
      return NextResponse.json({ products: [], selected_product_ids: [] });
    }

    const [productsResult, selectionsResult] = await Promise.all([
      supabaseAdmin
        .from("products")
        .select(CARD_FIELDS)
        .in("id", requestedIDs)
        .eq("is_published", true),
      supabaseAdmin
        .from("retailer_selections")
        .select("product_id")
        .eq("retailer_id", retailer.id)
        .in("product_id", requestedIDs),
    ]);

    if (productsResult.error) {
      console.error("[marketplace/hydrate] Product query failed:", productsResult.error.message);
      return NextResponse.json({ error: "Could not hydrate products" }, { status: 500 });
    }

    const productMap = new Map();
    for (const p of productsResult.data || []) {
      productMap.set(p.id, p);
    }

    // Preserve the exact caller-requested ranking order, omitting unpublished/missing items
    const orderedProducts = [];
    for (const id of requestedIDs) {
      const product = productMap.get(id);
      if (product) {
        orderedProducts.push(product);
      }
    }

    const selectedProductIDs = (selectionsResult.data || []).map((row) => row.product_id);

    return NextResponse.json(
      {
        products: orderedProducts,
        selected_product_ids: selectedProductIDs,
      },
      {
        headers: {
          "Cache-Control": "private, no-store, max-age=0",
        },
      }
    );
  } catch (error) {
    console.error("[marketplace/hydrate] Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
