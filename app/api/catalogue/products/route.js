import { catalogueTypeAliases } from "../../../../lib/config/jewelleryTypes.mjs";
import { NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase/server";

export async function GET(request) {
  const supabase = await createClient();

  // ── 1. Auth guard ──────────────────────────────────────────────────────────
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // ── 2. Parse query params ──────────────────────────────────────────────────
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category") ?? "";
  const page     = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit    = Math.min(50, parseInt(searchParams.get("limit") ?? "20", 10));

  const fromIndex = (page - 1) * limit;
  const toIndex   = fromIndex + limit - 1;

  // ── 3. Build query ─────────────────────────────────────────────────────────
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
       processed_image_url,
       generated_image_urls,
       showcase_image_urls,
       raw_image_url,
       image_url,
       wholesaler_email,
       is_published,
       created_at`,
      { count: "exact" }
    )
    .eq("wholesaler_id", user.id);

  if (category && category.toLowerCase() !== "all") {
    query = query.in("jewellery_type", catalogueTypeAliases(category));
  }

  // Handle array filters
  const sizes = searchParams.getAll("size[]");
  if (sizes.length > 0) {
    const parsedSizes = sizes.map(s => s.toLowerCase().replace(/\s+/g, ''));
    query = query.in("size", parsedSizes);
  }

  const weights = searchParams.getAll("weight[]");
  if (weights.length > 0) {
    const weightOrGroups = weights.map(w => {
      if (w.includes("+")) {
        const min = parseFloat(w);
        return `net_weight.gte.${min}`;
      } else {
        const [minStr, maxStr] = w.replace(" g", "").split("-");
        const min = parseFloat(minStr);
        const max = parseFloat(maxStr);
        return `and(net_weight.gte.${min},net_weight.lte.${max})`;
      }
    });
    query = query.or(weightOrGroups.join(","));
  }
  
  const availability = searchParams.getAll("availability[]");
  if (availability.length > 0) {
    const availOrGroups = availability.map(a => {
      if (a === "In stock") return `stock_available.eq.true`;
      if (a === "Within 5 days") return `and(stock_available.eq.false,make_to_order_days.lte.5)`;
      if (a === "Within 15 days") return `and(stock_available.eq.false,make_to_order_days.lte.15)`;
      if (a === "Within 30 days") return `and(stock_available.eq.false,make_to_order_days.lte.30)`;
      if (a === "More than 30 days") return `and(stock_available.eq.false,make_to_order_days.gt.30)`;
      return "";
    }).filter(Boolean);
    if (availOrGroups.length > 0) {
      query = query.or(availOrGroups.join(","));
    }
  }

  const purities = searchParams.getAll("purity[]");
  if (purities.length > 0) {
    const parsedPurities = purities.map(p => {
      if (p.includes("24K")) return "24k";
      if (p.includes("22K")) return "22k";
      if (p.includes("18K")) return "18k";
      if (p.includes("14K")) return "14k";
      if (p.includes("925")) return "925";
      if (p.includes("950")) return "950pt";
      return p.toLowerCase();
    });
    query = query.in("metal_purity", parsedPurities);
  }

  // TODO: Add Trending Sort logic here when retailer phase columns are added (likes, view_count, is_published)
  
  query = query
    .order("created_at", { ascending: false })
    .range(fromIndex, toIndex);

  const { data, count, error } = await query;

  if (error) {
    console.error("[GET /api/catalogue/products]", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: data ?? [], count: count ?? 0 });
}
