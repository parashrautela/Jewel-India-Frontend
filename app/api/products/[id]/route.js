import { NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase/server";

export async function PATCH(request, context) {
  try {
    const supabase = await createClient();

    // 1. Auth Guard
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: "Product ID missing" }, { status: 400 });
    }


    const body = await request.json();
    const updatePayload = {};
    if (typeof body.in_stock !== "undefined") updatePayload.stock_available = body.in_stock;

    if (typeof body.is_published !== "undefined") {
      if (body.is_published === true) {
        const { data: currentProduct, error: fetchErr } = await supabase
          .from("products")
          .select("ai_processing_state, ai_verified_output_urls, generated_image_urls, processed_image_url")
          .eq("id", id)
          .eq("wholesaler_id", user.id)
          .single();

        if (fetchErr || !currentProduct) {
          return NextResponse.json({ error: "Product not found or unauthorized" }, { status: 404 });
        }

        const isVerified = (
          (currentProduct.ai_processing_state === "ready" && Array.isArray(currentProduct.ai_verified_output_urls) && currentProduct.ai_verified_output_urls.length > 0) ||
          (Array.isArray(currentProduct.generated_image_urls) && currentProduct.generated_image_urls.length > 0) ||
          Boolean(currentProduct.processed_image_url)
        );

        if (!isVerified) {
          return NextResponse.json(
            { error: "Product cannot be published until AI imagery is generated and verified.", code: "PRODUCT_AI_OUTPUT_REQUIRED" },
            { status: 422 }
          );
        }
      }
      updatePayload.is_published = body.is_published;
    }

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json({ error: "Invalid payload: no valid fields to update" }, { status: 400 });
    }

    // 3. Update the product, returning the updated row. Ensure RLS only updates if it's their product.
    const { data, error } = await supabase
      .from("products")
      .update(updatePayload)
      .eq("id", id)
      .eq("wholesaler_id", user.id)
      .select()
      .single();

    if (error) {
      console.error("[PATCH /api/products/[id]] Supabase error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "Product not found or unauthorized" }, { status: 404 });
    }

    return NextResponse.json({ success: true, product: data });
  } catch (err) {
    console.error("[PATCH /api/products/[id]] Unexpected error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
