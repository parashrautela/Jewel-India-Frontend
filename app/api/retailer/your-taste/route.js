import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase/admin.js";
import { getRequestUser } from "../../../../lib/supabase/request-user.js";

export async function POST(request) {
  try {
    const { user, error: authError } = await getRequestUser(request);

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.user_metadata?.role !== "retailer") {
      return NextResponse.json({ error: "Retailer access required" }, { status: 403 });
    }

    const { product_id, selected } = await request.json();

    if (!product_id || typeof selected !== "boolean") {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    // Get retailer ID
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

    if (selected) {
      const { data: product, error: productError } = await supabaseAdmin
        .from("products")
        .select("id")
        .eq("id", product_id)
        .eq("is_published", true)
        .maybeSingle();
      if (productError) return NextResponse.json({ error: "Could not verify product availability" }, { status: 503 });
      if (!product) return NextResponse.json({ error: "Product is not available" }, { status: 404 });
      // Insert selection
      const { error: insertError } = await supabaseAdmin
        .from("retailer_selections")
        .insert({ retailer_id: retailer.id, product_id })
        .select()
        .single();
      
      // Ignore conflict error if they already selected it
      if (insertError && insertError.code !== '23505') {
        console.error("Insert selection error:", insertError);
        return NextResponse.json({ error: "Failed to select" }, { status: 500 });
      }
    } else {
      // Delete selection
      const { error: deleteError } = await supabaseAdmin
        .from("retailer_selections")
        .delete()
        .eq("retailer_id", retailer.id)
        .eq("product_id", product_id);

      if (deleteError) {
        console.error("Delete selection error:", deleteError);
        return NextResponse.json({ error: "Failed to unselect" }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[POST /api/retailer/your-taste]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
