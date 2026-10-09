"use server";

import { revalidatePath } from "next/cache";
import { normalizeChainType } from "../config/jewelleryTypes.mjs";
import { createClient } from "../supabase/server";


export async function saveProduct(payload) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const {
    product_id,   // UUID created by backend POST /process
    title,
    jewellery_type,
    category,
    style,
    size,
    stock_available,
    make_to_order_days,
    metal_purity,
    net_weight,
    gross_weight,
    stone_weight,
    raw_image_url,
    processed_image_url,  // first variant URL — written here as safety net
    generated_image_urls, // array of all variant URLs
    is_published,
  } = payload;

  const updatePayload = {
    wholesaler_id:      user.id,
    wholesaler_email:   user.email,
    title,
    jewellery_type: normalizeChainType(jewellery_type),
    category,
    style,
    size,
    stock_available:    !!stock_available,
    make_to_order_days: make_to_order_days ? parseInt(make_to_order_days) : null,
    metal_purity,
    net_weight:         net_weight   ? parseFloat(net_weight)   : null,
    gross_weight:       gross_weight ? parseFloat(gross_weight) : null,
    stone_weight:       stone_weight ? parseFloat(stone_weight) : null,
    raw_image_url,
    // Safety net: write these if the backend hasn't yet (shouldn't happen
    // normally, but ensures the row is always queryable from the catalogue)
    ...(processed_image_url  ? { processed_image_url }  : {}),
    ...(generated_image_urls?.length ? { generated_image_urls } : {}),
    ...(typeof is_published !== "undefined" ? { is_published: !!is_published } : {}),
  };

  const { data: updated, error } = await supabase
    .from("products")
    .update(updatePayload)
    .eq("id", product_id)
    .select("id");

  if (error)            return { error: error.message };
  if (!updated?.length) return { error: "Save blocked: 0 rows updated. Have you run the RLS hotfix SQL in your Supabase dashboard? See SUPABASE_SETUP.sql Step 0." };

  revalidatePath("/");
  return { success: true };
}

export async function clearProductImages(productId) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("products")
    .update({
      processed_image_url: null,
      generated_image_urls: [],
    })
    .eq("id", productId)
    .eq("wholesaler_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/");
  return { success: true };
}

export async function insertProduct(payload) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const {
    title,
    jewellery_type,
    category,
    style,
    size,
    stock_available,
    make_to_order_days,
    metal_purity,
    net_weight,
    gross_weight,
    stone_weight,
    raw_image_url,
  } = payload;

  const insertPayload = {
    wholesaler_id:      user.id,
    wholesaler_email:   user.email,
    title,
    jewellery_type: normalizeChainType(jewellery_type),
    category,
    style,
    size,
    stock_available:    !!stock_available,
    make_to_order_days: make_to_order_days ? parseInt(make_to_order_days) : null,
    metal_purity,
    net_weight:         net_weight   ? parseFloat(net_weight)   : null,
    gross_weight:       gross_weight ? parseFloat(gross_weight) : null,
    stone_weight:       stone_weight ? parseFloat(stone_weight) : null,
    raw_image_url:       raw_image_url || null,
    processed_image_url: null,
    generated_image_urls: [],
    is_published:        false,
  };

  if (raw_image_url) {
    const ownRawImagePrefix = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/plant-images/raw/${user.id}/`;
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !raw_image_url.startsWith(ownRawImagePrefix)) {
      return { error: "Invalid draft image URL." };
    }
  }

  const { data: inserted, error } = await supabase
    .from("products")
    .insert(insertPayload)
    .select("id")
    .single();

  if (error)            return { error: error.message };
  if (!inserted?.id)    return { error: "Failed to insert product: no ID returned" };

  revalidatePath("/");
  return { success: true, product_id: inserted.id };
}
