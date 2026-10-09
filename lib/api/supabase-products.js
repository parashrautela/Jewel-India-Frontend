import { createClient } from "../supabase/server";

/**
 * Fetch all products from Supabase (public — no auth required).
 * Returns newest-first.
 */
export async function getAllProducts() {
  const supabase = await createClient();
  let data, error;
  try {
    ({ data, error } = await supabase
      .from("products")
      .select(
        `id,
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
       processed_image_url,
       generated_image_urls,
       showcase_image_urls,
       wholesaler_email,
       is_published,
       created_at`
      )
      .eq("is_published", true)
      .order("created_at", { ascending: false }));
  } catch (fetchErr) {
    console.error("[getAllProducts] Network error (Supabase unreachable):", fetchErr.message);
    return [];
  }

  if (error) {
    console.error("[getAllProducts]", error.message);
    return [];
  }

  return data ?? [];
}

export async function getProductsByWholesaler({
  wholesaler_id,
  email,
  category,
  page = 1,
  limit = 12,
} = {}) {
  const supabase = await createClient();

  const fromIndex = (page - 1) * limit;
  const toIndex = fromIndex + limit - 1;

  let query = supabase
    .from("products")
    .select(
      `id,
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
       image_url,
       processed_image_url,
       generated_image_urls,
       raw_image_url,
       wholesaler_email,
       created_at`,
      { count: "exact" }
    );

  // Filter by user ID if provided; otherwise fallback to email
  if (wholesaler_id) {
    query = query.eq("wholesaler_id", wholesaler_id);
  } else if (email) {
    query = query.eq("wholesaler_email", email);
  } else {
    // Missing both identifiers
    return { data: [], count: 0 };
  }

  // Filter by category if provided
  if (category && category.toLowerCase() !== "all") {
    // Find absolute match or ILIKE depending on how strict we want. 
    // Usually absolute match works if category slugs match accurately.
    query = query.ilike("category", `%${category}%`);
  }

  query = query
    .order("created_at", { ascending: false })
    .range(fromIndex, toIndex);

  try {
    const { data, count, error } = await query;

    if (error) {
      console.error("[getProductsByWholesaler]", error.message);
      return { data: [], count: 0 };
    }

    return { data: data ?? [], count: count ?? 0 };
  } catch (fetchErr) {
    console.error("[getProductsByWholesaler] Network error:", fetchErr.message);
    return { data: [], count: 0 };
  }
}
