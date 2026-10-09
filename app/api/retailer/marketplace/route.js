import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase/admin.js";
import { getRequestUser } from "../../../../lib/supabase/request-user.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CARD_FIELDS = `
  id, title, jewellery_type, category, style, size,
  stock_available, make_to_order_days, metal_purity, net_weight,
  gross_weight, stone_weight, raw_image_url, processed_image_url,
  image_url, generated_image_urls, showcase_image_urls, image_variants,
  is_published, created_at
`;

function sanitizeSearch(str) {
  if (!str) return "";
  return str.replace(/[%_]/g, " ").trim();
}

function decodeCursor(cursorStr) {
  if (!cursorStr) return null;
  try {
    const raw = Buffer.from(cursorStr, "base64").toString("utf8");
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    if (!parsed.created_at || !parsed.id) return null;
    const date = new Date(parsed.created_at);
    if (isNaN(date.getTime())) return null;
    return parsed;
  } catch {
    return null;
  }
}

function encodeCursor(product, category, search) {
  if (!product) return null;
  const payload = {
    created_at: product.created_at,
    id: product.id,
    category: category || null,
    search: search || null,
  };
  return Buffer.from(JSON.stringify(payload)).toString("base64");
}

function parseSearchParams(request) {
  if (request?.nextUrl?.searchParams) {
    return request.nextUrl.searchParams;
  }
  const URLClass = typeof URL !== "undefined" ? URL : (typeof globalThis !== "undefined" ? globalThis.URL : null);
  if (request?.url && URLClass) {
    try {
      return new URLClass(request.url).searchParams;
    } catch {
      // ignore
    }
  }
  const ParamsClass = typeof URLSearchParams !== "undefined"
    ? URLSearchParams
    : (typeof globalThis !== "undefined" ? globalThis.URLSearchParams : null);
  if (ParamsClass) {
    return new ParamsClass();
  }
  return {
    has: () => false,
    get: () => null,
  };
}

/**
 * Product-first retailer marketplace. Supplier profile fields are deliberately
 * excluded; supplier identity is resolved only by the later order workflow.
 * Supports backward-compatible legacy unpaginated calls and opt-in keyset pagination.
 */
export async function GET(request) {
  const t0 = Date.now();
  try {
    const { user, error: authError } = await getRequestUser(request);
    const tAuth = Date.now() - t0;
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.user_metadata?.role !== "retailer") {
      return NextResponse.json({ error: "Retailer access required" }, { status: 403 });
    }

    const t1 = Date.now();
    const { data: retailer, error: retailerError } = await supabaseAdmin
      .from("retailers")
      .select("id, verification_status")
      .eq("user_id", user.id)
      .single();
    const tRetailer = Date.now() - t1;

    if (retailerError || !retailer) {
      return NextResponse.json({ error: "Retailer profile not found" }, { status: 404 });
    }
    if (retailer.verification_status !== "verified") {
      return NextResponse.json({ error: "Retailer verification is required" }, { status: 403 });
    }

    const searchParams = parseSearchParams(request);
    // Detect if caller requested pagination/filtering
    const isPaginated = (
      searchParams.has("cursor") ||
      searchParams.has("limit") ||
      searchParams.has("category") ||
      searchParams.has("search") ||
      searchParams.get("version") === "v2"
    );

    // --- Legacy Unpaginated Contract ---
    if (!isPaginated) {
      const t2 = Date.now();
      const [productsResult, selectionsResult] = await Promise.all([
        supabaseAdmin
          .from("products")
          .select(CARD_FIELDS)
          .eq("is_published", true)
          .order("created_at", { ascending: false }),
        supabaseAdmin
          .from("retailer_selections")
          .select("product_id")
          .eq("retailer_id", retailer.id),
      ]);
      const tQueries = Date.now() - t2;

      if (productsResult.error) {
        console.error("[retailer/marketplace] Product query failed:", productsResult.error.message);
        return NextResponse.json({ error: "Could not load the catalogue" }, { status: 500 });
      }

      const headers = {
        "Cache-Control": "private, no-store, max-age=0",
        "Server-Timing": `auth;dur=${tAuth}, retailer;dur=${tRetailer}, queries;dur=${tQueries}`,
      };

      return NextResponse.json({
        products: productsResult.data || [],
        selected_product_ids: (selectionsResult.data || []).map((row) => row.product_id),
      }, { headers });
    }

    // --- Opt-in Keyset Paginated Contract ---
    const rawLimit = parseInt(searchParams.get("limit") || "24", 10);
    const limit = Math.min(Math.max(isNaN(rawLimit) ? 24 : rawLimit, 1), 50);
    const categoryParam = searchParams.get("category")?.trim() || null;
    const searchParam = sanitizeSearch(searchParams.get("search") || "");
    const rawCursor = searchParams.get("cursor");

    let cursor = null;
    if (rawCursor) {
      cursor = decodeCursor(rawCursor);
      if (!cursor) {
        return NextResponse.json({ error: "Invalid pagination cursor" }, { status: 400 });
      }
      // Ensure cursor binding matches active filters
      const cursorCat = cursor.category || null;
      const cursorSearch = cursor.search || "";
      if (cursorCat !== categoryParam || cursorSearch !== searchParam) {
        return NextResponse.json({
          error: "Cursor does not match current filter parameters",
        }, { status: 400 });
      }
    }

    const t2 = Date.now();
    let query = supabaseAdmin
      .from("products")
      .select(CARD_FIELDS)
      .eq("is_published", true);

    if (categoryParam) {
      query = query.ilike("jewellery_type", categoryParam);
    }

    if (searchParam) {
      query = query.or(
        `title.ilike.%${searchParam}%,jewellery_type.ilike.%${searchParam}%,category.ilike.%${searchParam}%,style.ilike.%${searchParam}%,metal_purity.ilike.%${searchParam}%`
      );
    }

    if (cursor) {
      query = query.or(
        `created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.lt.${cursor.id})`
      );
    }

    query = query
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(limit + 1);

    const { data: pageRows, error: productsError } = await query;
    const tProducts = Date.now() - t2;

    if (productsError) {
      console.error("[retailer/marketplace] Paginated query failed:", productsError.message);
      return NextResponse.json({ error: "Could not load the catalogue" }, { status: 500 });
    }

    const rawProducts = pageRows || [];
    const hasMore = rawProducts.length > limit;
    const products = hasMore ? rawProducts.slice(0, limit) : rawProducts;

    const lastProduct = products.length > 0 ? products[products.length - 1] : null;
    const nextCursor = (hasMore && lastProduct)
      ? encodeCursor(lastProduct, categoryParam, searchParam)
      : null;

    // Fetch selections only for the products on this page
    const t3 = Date.now();
    let selectedProductIDs = [];
    if (products.length > 0) {
      const productIDs = products.map((p) => p.id);
      const { data: selectionsData, error: selectionsError } = await supabaseAdmin
        .from("retailer_selections")
        .select("product_id")
        .eq("retailer_id", retailer.id)
        .in("product_id", productIDs);

      if (!selectionsError && selectionsData) {
        selectedProductIDs = selectionsData.map((row) => row.product_id);
      }
    }
    const tSelections = Date.now() - t3;

    const headers = {
      "Cache-Control": "private, no-cache, no-transform",
      "Server-Timing": `auth;dur=${tAuth}, retailer;dur=${tRetailer}, products;dur=${tProducts}, selections;dur=${tSelections}`,
    };

    return NextResponse.json({
      products,
      selected_product_ids: selectedProductIDs,
      has_more: hasMore,
      next_cursor: nextCursor,
      page_size: products.length,
    }, { headers });
  } catch (error) {
    console.error("[retailer/marketplace] Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
