import { unstable_cache } from "next/cache";
import { supabaseAdmin } from "../supabase/admin";
import { categories } from "../config/catalogueCategories";
import { normalizeThemeId } from "../config/themePreference";

const PRODUCT_REVALIDATE = 60;
const ORDERS_REVALIDATE = 30;
const QUERIES_REVALIDATE = 30;
const SETTINGS_REVALIDATE = 300;

export const getRetailerSidebarProfile = unstable_cache(
  async (userId) => {
    const { data } = await supabaseAdmin
      .from("retailers")
      .select("full_name, business_name, business_logo_url")
      .eq("user_id", userId)
      .single();
    return data || null;
  },
  ["retailer-sidebar-profile"],
  { revalidate: SETTINGS_REVALIDATE }
);

export const getRetailerTheme = unstable_cache(
  async (userId) => {
    const { data } = await supabaseAdmin
      .from("retailers")
      .select("selected_theme")
      .eq("user_id", userId)
      .maybeSingle();
    return data?.selected_theme || "indian";
  },
  ["retailer-theme"],
  { revalidate: SETTINGS_REVALIDATE }
);

export const getRetailerDashboardData = unstable_cache(
  async (userId) => {
    const { data: retailer } = await supabaseAdmin
      .from("retailers")
      .select("id, business_name")
      .eq("user_id", userId)
      .single();

    if (!retailer) {
      return {
        employeesCount: 0,
        activeEmployeesCount: 0,
        activeDesigns: 0,
        totalDesigns: 0,
        archivedDesigns: 0,
        recentEmployees: [],
      };
    }

    const [empCountResult, activeEmpResult, totalDesignResult, activeDesignResult, recentEmpData] =
      await Promise.all([
        supabaseAdmin
          .from("employees")
          .select("*", { count: "exact", head: true })
          .eq("retailer_id", retailer.id),
        supabaseAdmin
          .from("employees")
          .select("*", { count: "exact", head: true })
          .eq("retailer_id", retailer.id)
          .eq("status", "active"),
        supabaseAdmin
          .from("retailer_designs")
          .select("*", { count: "exact", head: true })
          .eq("retailer_id", retailer.id),
        supabaseAdmin
          .from("retailer_designs")
          .select("*", { count: "exact", head: true })
          .eq("retailer_id", retailer.id)
          .eq("is_archived", false),
        supabaseAdmin
          .from("employees")
          .select("id, full_name, designation, status, email, created_at")
          .eq("retailer_id", retailer.id)
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

    const totalDesigns = totalDesignResult.count || 0;
    const activeDesigns = activeDesignResult.count || 0;

    return {
      employeesCount: empCountResult.count || 0,
      activeEmployeesCount: activeEmpResult.count || 0,
      activeDesigns,
      totalDesigns,
      archivedDesigns: totalDesigns - activeDesigns,
      recentEmployees: recentEmpData.data || [],
    };
  },
  ["retailer-dashboard-data"],
  { revalidate: PRODUCT_REVALIDATE }
);

export const getRetailerYourTasteData = unstable_cache(
  async (userId) => {
    const { data: retailer } = await supabaseAdmin
      .from("retailers")
      .select("id, verification_status")
      .eq("user_id", userId)
      .single();

    if (!retailer || retailer.verification_status !== "verified") return null;

    const [productsResult, selectionsResult] = await Promise.all([
      supabaseAdmin
        .from("products")
        .select(
          `id,
           title,
           jewellery_type,
           category,
           style,
           size,
           metal_purity,
           net_weight,
           gross_weight,
           stone_weight,
           stock_available,
           make_to_order_days,
           processed_image_url,
           raw_image_url,
           image_url,
           generated_image_urls,
           showcase_image_urls,
           wholesaler_email,
           created_at`
        )
        .eq("is_published", true)
        .order("created_at", { ascending: false }),
      supabaseAdmin
        .from("retailer_selections")
        .select("product_id")
        .eq("retailer_id", retailer.id),
    ]);

    return {
      products: productsResult.data || [],
      selectedProductIds: (selectionsResult.data || []).map((s) => s.product_id),
      categoryTabs: categories.map((cat) => ({
        name: cat.name,
        slug: cat.slug,
        image: cat.image,
      })),
    };
  },
  ["retailer-your-taste-data"],
  { revalidate: PRODUCT_REVALIDATE }
);

export const getEmployeeRetailerShell = unstable_cache(
  async (retailerId) => {
    const { data: retailer, error } = await supabaseAdmin
      .from("retailers")
      .select("id, business_name")
      .eq("id", retailerId)
      .single();

    if (!error && retailer) {
      return {
        businessName: retailer.business_name || "Your Store",
      };
    }

    const { data: fallbackRetailer } = await supabaseAdmin
      .from("retailers")
      .select("id, business_name")
      .eq("id", retailerId)
      .single();

    return {
      businessName: fallbackRetailer?.business_name || "Your Store",
    };
  },
  ["employee-retailer-shell"],
  { revalidate: SETTINGS_REVALIDATE }
);

export async function getEmployeeRetailerTheme(retailerId) {
  const { data } = await supabaseAdmin
    .from("retailers")
    .select("selected_theme")
    .eq("id", retailerId)
    .maybeSingle();

  return normalizeThemeId(data?.selected_theme);
}

export const getEmployeeUnreadQueries = unstable_cache(
  async (employeeId) => {
    const { data } = await supabaseAdmin
      .from("conversations")
      .select(`id, messages!inner(id)`)
      .eq("employee_id", employeeId)
      .eq("messages.sender_type", "wholesaler")
      .eq("messages.is_read", false);
    return Boolean(data && data.length > 0);
  },
  ["employee-unread-queries"],
  { revalidate: QUERIES_REVALIDATE }
);

export const getEmployeeLatestOrderUpdate = unstable_cache(
  async (employeeId) => {
    const { data } = await supabaseAdmin
      .from("orders")
      .select("updated_at")
      .eq("employee_id", employeeId)
      .neq("status", "pending")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return data?.updated_at || null;
  },
  ["employee-latest-order-update"],
  { revalidate: ORDERS_REVALIDATE }
);

export const getEmployeeHomeData = unstable_cache(
  async (retailerId) => {
    const [retailerResult, designsResult] = await Promise.all([
      supabaseAdmin
        .from("retailers")
        .select("id, business_name, business_logo_url")
        .eq("id", retailerId)
        .single(),
      supabaseAdmin
        .from("retailer_designs")
        .select("id, image_url, title, category, tags, is_archived, created_at, size, purity, net_weight, gross_weight, stone_weight, type, style_aesthetic, is_in_stock, production_time_days")
        .eq("retailer_id", retailerId)
        .eq("is_archived", false),
    ]);

    return {
      retailer: retailerResult.data || null,
      designs: designsResult.data || [],
    };
  },
  ["employee-home-data"],
  { revalidate: PRODUCT_REVALIDATE }
);

export const getEmployeeDesignsData = unstable_cache(
  async (retailerId) => {
    const [retailerResult, designsResult] = await Promise.all([
      supabaseAdmin
        .from("retailers")
        .select("business_name")
        .eq("id", retailerId)
        .single(),
      supabaseAdmin
        .from("retailer_designs")
        .select("id, image_url, title, category, tags, created_at, size, purity, net_weight, gross_weight, stone_weight, type, style_aesthetic, is_in_stock, production_time_days")
        .eq("retailer_id", retailerId)
        .eq("is_archived", false)
        .order("created_at", { ascending: false }),
    ]);

    return {
      retailer: retailerResult.data || null,
      designs: designsResult.data || [],
    };
  },
  ["employee-designs-data"],
  { revalidate: PRODUCT_REVALIDATE }
);

export const getEmployeeSelectedProducts = unstable_cache(
  async (retailerId) => {
    const { data: selections, error: selErr } = await supabaseAdmin
      .from("retailer_selections")
      .select("product_id")
      .eq("retailer_id", retailerId);

    if (selErr) {
      console.error("[employee] retailer_selections fetch error:", selErr.message);
      return [];
    }

    const selectedIds = (selections || []).map((s) => s.product_id);
    if (selectedIds.length === 0) return [];

    const { data, error: prodErr } = await supabaseAdmin
      .from("products")
      .select(`
        id, title, jewellery_type, category, style, size, stock_available,
        make_to_order_days, metal_purity, net_weight, gross_weight, stone_weight,
        raw_image_url, processed_image_url, generated_image_urls, wholesaler_id,
        wholesaler_email, created_at
      `)
      .eq("is_published", true)
      .in("id", selectedIds)
      .order("created_at", { ascending: false });

    if (prodErr) {
      console.error("[employee] selected products fetch error:", prodErr.message);
    }

    return data || [];
  },
  ["employee-selected-products"],
  { revalidate: PRODUCT_REVALIDATE }
);

export const getEmployeeOrders = unstable_cache(
  async (retailerId) => {
    const { data: rawOrders, error } = await supabaseAdmin
      .from("orders")
      .select(`
        *,
        products (
          id, title, raw_image_url, processed_image_url, generated_image_urls, jewellery_type, metal_purity, net_weight, category, make_to_order_days
        ),
        retailers (
          id, business_name, city, state, created_at
        )
      `)
      .eq("retailer_id", retailerId)
      .eq("is_visible_to_employee", true)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[employee/orders] fetch error:", error.message);
      return [];
    }

    let orders = rawOrders || [];
    if (orders.length === 0) return orders;

    const wholesalerUserIds = [...new Set(orders.map((o) => o.wholesaler_id))];
    const { data: wholesalers } = await supabaseAdmin
      .from("wholesalers")
      .select("id, user_id, business_name, city, state, created_at, email, full_name")
      .in("user_id", wholesalerUserIds);

    if (!wholesalers) return orders;

    const wMap = {};
    wholesalers.forEach((w) => {
      wMap[w.user_id] = w;
    });

    return orders.map((o) => ({
      ...o,
      wholesalers: wMap[o.wholesaler_id] || null,
    }));
  },
  ["employee-orders"],
  { revalidate: ORDERS_REVALIDATE }
);

export const getEmployeeConversations = unstable_cache(
  async (employeeId) => {
    const { data: initialConversations } = await supabaseAdmin
      .from("conversations")
      .select(`
        *,
        product:product_id(title, processed_image_url, raw_image_url),
        employee:employee_id(full_name, retailer_id),
        retailer:retailer_id(business_name),
        wholesaler_profile:wholesaler_id(email),
        messages(id, content, is_read, sender_type, created_at)
      `)
      .eq("employee_id", employeeId)
      .eq("is_visible_to_employee", true)
      .order("updated_at", { ascending: false });

    return (initialConversations || []).map((conv) => {
      const msgs = conv.messages || [];
      msgs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      const lastMsg = msgs[0];
      const hasUnread = msgs.some((m) => !m.is_read && m.sender_type === "wholesaler");
      const { messages, ...rest } = conv;

      return {
        ...rest,
        has_unread: hasUnread,
        last_message: lastMsg ? lastMsg.content : "",
      };
    });
  },
  ["employee-conversations"],
  { revalidate: QUERIES_REVALIDATE }
);

export const getEmployeeQuestionnaireRetailer = unstable_cache(
  async (retailerId) => {
    const { data } = await supabaseAdmin
      .from("retailers")
      .select("business_name")
      .eq("id", retailerId)
      .single();
    return data?.business_name || "Your Store";
  },
  ["employee-questionnaire-retailer"],
  { revalidate: SETTINGS_REVALIDATE }
);
