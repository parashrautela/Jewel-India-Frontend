import { supabaseAdmin } from "../../../../lib/supabase/admin";
import { getRequestUser } from "../../../../lib/supabase/request-user.js";
import { assertFeature } from "../../../../lib/featureFlags.js";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { user, error: authError } = await getRequestUser(request);
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = user.user_metadata?.role;
    let retailerId = null;
    let employeeId = null;

    if (role === "employee") {
      const { data: employee, error: employeeError } = await supabaseAdmin
        .from("employees")
        .select("id, retailer_id, status")
        .eq("auth_user_id", user.id)
        .single();
      if (employeeError || !employee || employee.status !== "active") {
        return NextResponse.json({ error: "Active employee access required" }, { status: 403 });
      }
      employeeId = employee.id;
      retailerId = employee.retailer_id;
    } else if (role === "retailer") {
      const { data: retailer, error: retailerError } = await supabaseAdmin
        .from("retailers")
        .select("id, verification_status")
        .eq("user_id", user.id)
        .single();
      if (retailerError || !retailer || retailer.verification_status !== "verified") {
        return NextResponse.json({ error: "Verified retailer access required" }, { status: 403 });
      }
      retailerId = retailer.id;
    } else {
      return NextResponse.json({ error: "Retailer or employee access required" }, { status: 403 });
    }

    const body = await request.json();
    const { items } = body; 
    // items should be [{ product_id, wholesaler_id, quantity, customization_notes }]

    if (!items || !Array.isArray(items) || items.length === 0 || items.length > 20) {
      return NextResponse.json({ error: "No items provided" }, { status: 400 });
    }

    const productIds = [...new Set(items.map((item) => item?.product_id).filter(Boolean))];
    if (productIds.length !== items.length) {
      return NextResponse.json({ error: "Every order item needs a unique product" }, { status: 400 });
    }

    // Resolve products server-side. Never trust a client-supplied wholesaler id;
    // that could route an order to the wrong business or reveal hidden identity.
    const { data: products, error: productsError } = await supabaseAdmin
      .from("products")
      .select("id, wholesaler_id, is_published")
      .in("id", productIds)
      .eq("is_published", true);

    if (productsError || !products || products.length !== productIds.length) {
      return NextResponse.json({ error: "One or more products are unavailable" }, { status: 409 });
    }

    // Verify each supplier in the order has 'orders' feature enabled
    const uniqueWholesalerIds = [...new Set(products.map((p) => p.wholesaler_id).filter(Boolean))];
    for (const wid of uniqueWholesalerIds) {
      const blockedResponse = await assertFeature(
        supabaseAdmin,
        wid,
        "orders",
        "This supplier is not accepting orders right now."
      );
      if (blockedResponse) {
        return blockedResponse;
      }
    }

    const productMap = new Map(products.map((product) => [product.id, product]));

    const ordersToInsert = items.map(item => {
      const product = productMap.get(item.product_id);
      const quantity = Number.isInteger(item.quantity) && item.quantity > 0 && item.quantity <= 999
        ? item.quantity
        : 1;
      const cleanNote = typeof item.customization_notes === "string"
        ? item.customization_notes.trim().slice(0, 2000)
        : "";

      // Since the schema doesn't have a quantity column, we can prepend it to the customization note
      // if the quantity is greater than 1, so the wholesaler still sees it.
      let finalNote = cleanNote || null;
      if (quantity > 1) {
        finalNote = finalNote ? `Quantity Requested: ${quantity}\n\n${finalNote}` : `Quantity Requested: ${quantity}`;
      }

      return {
        employee_id: employeeId,
        retailer_id: retailerId,
        wholesaler_id: product.wholesaler_id,
        product_id: item.product_id,
        customization_note: finalNote,
        status: "pending",
        placed_by_user_id: user.id,
        placed_by_role: role,
      };
    });

    // Insert orders (using admin to ensure no RLS hiccups on insert if policies are strict)
    const { data: insertedOrders, error: insertError } = await supabaseAdmin
      .from("orders")
      .insert(ordersToInsert)
      .select();

    if (insertError) {
      console.error("[orders/create] Insert error:", insertError);
      return NextResponse.json({ error: "Failed to create orders" }, { status: 500 });
    }

    // Identity is returned only after the insert succeeds. Browse endpoints do
    // not expose these business fields.
    const wholesalerUserIds = [...new Set(insertedOrders.map((order) => order.wholesaler_id))];
    const { data: wholesalers } = await supabaseAdmin
      .from("wholesalers")
      .select("user_id, business_name, full_name, city, state")
      .in("user_id", wholesalerUserIds);

    const suppliers = Object.fromEntries((wholesalers || []).map((wholesaler) => [
      wholesaler.user_id,
      {
        business_name: wholesaler.business_name,
        full_name: wholesaler.full_name,
        city: wholesaler.city,
        state: wholesaler.state,
      },
    ]));

    return NextResponse.json({ success: true, data: insertedOrders, suppliers });
  } catch (err) {
    console.error("[orders/create] Unexpected error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
