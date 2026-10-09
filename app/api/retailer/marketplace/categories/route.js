import { NextResponse } from "next/server";
import { normalizeChainType } from "../../../../../lib/config/jewelleryTypes.mjs";
import { supabaseAdmin } from "../../../../../lib/supabase/admin.js";
import { getRequestUser } from "../../../../../lib/supabase/request-user.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Stable category metadata independent of loaded marketplace pages.
 * Cached with private max-age and background stale-while-revalidate.
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

    // Query published products' distinct jewellery_types and counts
    const { data: rows, error: queryError } = await supabaseAdmin
      .from("products")
      .select("jewellery_type")
      .eq("is_published", true);

    if (queryError) {
      console.error("[marketplace/categories] Query failed:", queryError.message);
      return NextResponse.json({ error: "Could not load categories" }, { status: 500 });
    }

    const countMap = {};
    for (const row of rows || []) {
      const type = row.jewellery_type?.trim();
      if (type) {
        const key = normalizeChainType(type.toLowerCase());
        if (!countMap[key]) {
          countMap[key] = {
            id: key,
            name: key === "chain" ? "Chains" : type.charAt(0).toUpperCase() + type.slice(1),
            count: 0,
          };
        }
        countMap[key].count += 1;
      }
    }

    const categories = Object.values(countMap).sort((a, b) =>
      a.name.localeCompare(b.name)
    );

    return NextResponse.json(
      { categories },
      {
        headers: {
          "Cache-Control": "private, max-age=300, stale-while-revalidate=600",
        },
      }
    );
  } catch (error) {
    console.error("[marketplace/categories] Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
