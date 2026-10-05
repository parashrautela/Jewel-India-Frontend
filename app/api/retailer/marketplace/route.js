import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase/admin.js";
import { getRequestUser } from "../../../../lib/supabase/request-user.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Product-first retailer marketplace. Supplier profile fields are deliberately
 * excluded; supplier identity is resolved only by the later order workflow.
 */
export async function GET(request) {
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

    const [productsResult, selectionsResult] = await Promise.all([
      supabaseAdmin
        .from("products")
        .select(`
          id, wholesaler_id, title, jewellery_type, category, style, size,
          stock_available, make_to_order_days, metal_purity, net_weight,
          gross_weight, stone_weight, raw_image_url, processed_image_url,
          image_url, generated_image_urls, showcase_image_urls, image_variants,
          is_published, created_at
        `)
        .eq("is_published", true)
        .order("created_at", { ascending: false }),
      supabaseAdmin
        .from("retailer_selections")
        .select("product_id")
        .eq("retailer_id", retailer.id),
    ]);

    if (productsResult.error) {
      console.error("[retailer/marketplace] Product query failed:", productsResult.error.message);
      return NextResponse.json({ error: "Could not load the catalogue" }, { status: 500 });
    }

    return NextResponse.json({
      products: productsResult.data || [],
      selected_product_ids: (selectionsResult.data || []).map((row) => row.product_id),
    }, { headers: { "Cache-Control": "private, no-store, max-age=0" } });
  } catch (error) {
    console.error("[retailer/marketplace] Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
