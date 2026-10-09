import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase/admin.js";

export async function POST(request) {
  const cookieStore = await cookies();
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }

    const role = user.user_metadata?.role;
    if (role !== "retailer") {
      return NextResponse.json({ error: "Forbidden: Only retailers can toggle views" }, { status: 403 });
    }

    const { mode } = await request.json();

    if (mode === "employee") {
      // 1. Fetch Retailer info to link virtual employee.
      // The owner's own "Admin" row is a system row: the database only lets
      // the service role write one (a user session may only insert Google
      // invitations), so everything below runs as the admin client.
      const { data: retailer, error: retailerError } = await supabaseAdmin
        .from("retailers")
        .select("id, full_name")
        .eq("user_id", user.id)
        .single();

      if (retailerError || !retailer) {
        return NextResponse.json({ error: "Retailer profile not found" }, { status: 404 });
      }

      // 2. Check if employee record already exists
      const { data: existingEmployees, error: searchError } = await supabaseAdmin
        .from("employees")
        .select("id, designation")
        .eq("auth_user_id", user.id);

      if (searchError) {
        return NextResponse.json({ error: `Failed to query employees table: ${searchError.message}` }, { status: 500 });
      }

      const hasVirtualProfile = existingEmployees && existingEmployees.some(
        emp => emp.designation === "Admin"
      );

      if (!hasVirtualProfile) {
        // 3. Auto-provision the virtual employee profile
        const fullName = retailer.full_name || user.user_metadata?.full_name || "Admin Owner";
        
        const baseInsertData = {
          auth_user_id: user.id,
          retailer_id: retailer.id,
          full_name: fullName,
          email: user.email,
          designation: "Admin",
          status: "active",
        };

        // Try inserting with 'is_system_generated' column, fallback if column missing
        const { error: insertError } = await supabaseAdmin
          .from("employees")
          .insert({
            ...baseInsertData,
            is_system_generated: true
          });

        if (insertError) {
          // If the is_system_generated column is missing, run fallback insert
          console.warn("is_system_generated column is missing in employees table, falling back to standard columns...", insertError.message);
          const { error: fallbackError } = await supabaseAdmin
            .from("employees")
            .insert(baseInsertData);

          if (fallbackError) {
            return NextResponse.json({ error: `Failed to auto-provision virtual employee profile: ${fallbackError.message}` }, { status: 500 });
          }
        }
      }

      // 4. Set the secure context cookie
      cookieStore.set("jewel_view_mode", "employee", {
        path: "/",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7, // 7 days
      });

      return NextResponse.json({ success: true, activeView: "employee" });
    } 
    
    if (mode === "retailer") {
      // Set the retailer context cookie
      cookieStore.set("jewel_view_mode", "retailer", {
        path: "/",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7, // 7 days
      });

      return NextResponse.json({ success: true, activeView: "retailer" });
    }

    return NextResponse.json({ error: "Invalid mode" }, { status: 400 });

  } catch (error) {
    return NextResponse.json({ error: `Internal Server Error: ${error.message}` }, { status: 500 });
  }
}
