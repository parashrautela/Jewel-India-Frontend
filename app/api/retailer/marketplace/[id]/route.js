import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../../lib/supabase/admin.js";
import { getRequestUser } from "../../../../../lib/supabase/request-user.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DETAIL_FIELDS = `
  id, title, jewellery_type, category, style, size,
  stock_available, make_to_order_days, metal_purity, net_weight,
  gross_weight, stone_weight, raw_image_url, processed_image_url,
  image_url, generated_image_urls, custom_image_urls, showcase_image_urls,
  image_variants, is_published, ai_processing_state, ai_verified_output_urls,
  created_at
`;

/**
 * Authenticated product detail endpoint for retailers.
 * Enforces publication check and verified retailer access.
 * Excludes supplier profile identity for catalogue browsing privacy.
 */
export async function GET(request, context) {
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

    const { id } = await (context?.params || {});
    if (!id) {
      return NextResponse.json({ error: "Product ID missing" }, { status: 400 });
    }

    const [productResult, selectionResult] = await Promise.all([
      supabaseAdmin
        .from("products")
        .select(DETAIL_FIELDS)
        .eq("id", id)
        .eq("is_published", true)
        .maybeSingle(),
      supabaseAdmin
        .from("retailer_selections")
        .select("id")
        .eq("retailer_id", retailer.id)
        .eq("product_id", id)
        .maybeSingle(),
    ]);

    if (productResult.error) {
      console.error("[marketplace/[id]] Product query error:", productResult.error.message);
      return NextResponse.json({ error: "Could not load product details" }, { status: 500 });
    }

    if (!productResult.data) {
      return NextResponse.json({ error: "Product unavailable or not found" }, { status: 404 });
    }

    const isSelected = Boolean(selectionResult?.data);

    return NextResponse.json(
      {
        product: productResult.data,
        is_selected: isSelected,
      },
      {
        headers: {
          "Cache-Control": "private, no-cache, no-transform",
        },
      }
    );
  } catch (error) {
    console.error("[marketplace/[id]] Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
