import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

// Helper to determine wholesaler destination based on verification status
async function getWholesalerDestination(supabase, userId) {
  const { data: wholesaler } = await supabase
    .from("wholesalers")
    .select("verification_status, has_visited_dashboard")
    .eq("user_id", userId)
    .single();

  if (!wholesaler) return "/onboard";

  if (wholesaler.verification_status === "banned") {
    return "/entry_page/signup?error=banned";
  }

  if (wholesaler.verification_status === "verified") {
    return "/dashboard/wholesaler";
  }

  return "/onboard/submitted";
}

async function getRetailerDestination(supabase, userId, request) {
  const { data: retailer } = await supabase
    .from("retailers")
    .select("verification_status")
    .eq("user_id", userId)
    .single();

  if (!retailer) return "/onboard-retailer";

  if (retailer.verification_status === "banned") {
    return "/entry_page/signup?error=banned";
  }

  if (retailer.verification_status === "verified") {
    const viewMode = request?.cookies.get("jewel_view_mode")?.value;
    if (viewMode === "retailer") {
      return "/dashboard/retailer";
    }
    return "/dashboard/employee";
  }

  // pending, on_hold, rejected, resubmission_required
  return "/onboard-retailer/submitted";
}

export async function updateSession(request) {
  if (request.nextUrl.pathname === "/share/wishlist") return NextResponse.next({ request });
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  function redirect(dest) {
    const url = request.nextUrl.clone();
    url.pathname = dest;
    return NextResponse.redirect(url);
  }

  // ── 1. Protect dashboard routes ──────────────────────────────
  if (pathname.startsWith("/dashboard")) {
    if (!user) return redirect("/signup");

    const role = user.user_metadata?.role;
    if (!role) return redirect("/onboard");

    // Retailer dashboard protection
    if (pathname.startsWith("/dashboard/retailer")) {
      const viewMode = request.cookies.get("jewel_view_mode")?.value;
      if (role === "retailer" && viewMode !== "retailer") {
        return redirect("/dashboard/employee");
      }

      if (role !== "retailer") {
        if (role === "wholesaler") return redirect("/dashboard/wholesaler");
        if (role === "employee") return redirect("/dashboard/employee");
        return redirect("/");
      }

      const { data: retailer } = await supabase
        .from("retailers")
        .select("verification_status")
        .eq("user_id", user.id)
        .single();

      if (!retailer) return redirect("/onboard-retailer");
      if (retailer.verification_status === "banned") {
        await supabase.auth.signOut();
        const url = request.nextUrl.clone();
        url.pathname = "/entry_page/signup";
        url.searchParams.set("error", "banned");
        return NextResponse.redirect(url);
      }
      if (retailer.verification_status !== "verified") {
        return redirect("/onboard-retailer/submitted");
      }
    }

    // Employee dashboard protection
    if (pathname.startsWith("/dashboard/employee")) {
      const viewMode = request.cookies.get("jewel_view_mode")?.value;
      const isRetailerInEmployeeMode = (role === "retailer" && viewMode !== "retailer");

      if (role !== "employee" && !isRetailerInEmployeeMode) {
        if (role === "wholesaler") return redirect("/dashboard/wholesaler");
        if (role === "retailer") return redirect("/dashboard/retailer");
        return redirect("/");
      }

      const { data: employee } = await supabase
        .from("employees")
        .select("status")
        .eq("auth_user_id", user.id)
        .single();

      if (!employee || employee.status !== "active") {
        if (role === "retailer") {
          return redirect("/dashboard/retailer");
        }
        await supabase.auth.signOut();
        const url = request.nextUrl.clone();
        url.pathname = "/employee-login";
        url.searchParams.set("error", "deactivated");
        return NextResponse.redirect(url);
      }
    }

    // Wholesaler dashboard protection
    if (pathname.startsWith("/dashboard/wholesaler")) {
      if (role !== "wholesaler") {
        if (role === "retailer") return redirect("/dashboard/retailer");
        if (role === "employee") return redirect("/dashboard/employee");
        return redirect("/");
      }

      const { data: wholesaler } = await supabase
        .from("wholesalers")
        .select("verification_status")
        .eq("user_id", user.id)
        .single();

      if (!wholesaler) return redirect("/onboard");

      if (wholesaler.verification_status === "banned") {
        await supabase.auth.signOut();
        const url = request.nextUrl.clone();
        url.pathname = "/entry_page/signup";
        url.searchParams.set("error", "banned");
        return NextResponse.redirect(url);
      }

      if (wholesaler.verification_status !== "verified") {
        return redirect("/onboard/submitted");
      }
    }
  }

  // ── 2. Homepage — generic redirect handler ─────────────────────
  if (pathname === "/") {
    if (user) {
      const role = user.user_metadata?.role;
      if (!role) return redirect("/onboard");
      if (role === "wholesaler") {
        const dest = await getWholesalerDestination(supabase, user.id);
        if (dest.includes("error=banned")) await supabase.auth.signOut();
        const url = request.nextUrl.clone();
        url.pathname = dest.split("?")[0];
        if (dest.includes("?")) {
          const params = new URLSearchParams(dest.split("?")[1]);
          params.forEach((value, key) => url.searchParams.set(key, value));
        }
        return NextResponse.redirect(url);
      }
      if (role === "retailer") {
        const dest = await getRetailerDestination(supabase, user.id, request);
        if (dest.includes("error=banned")) await supabase.auth.signOut();
        const url = request.nextUrl.clone();
        url.pathname = dest.split("?")[0];
        if (dest.includes("?")) {
          const params = new URLSearchParams(dest.split("?")[1]);
          params.forEach((value, key) => url.searchParams.set(key, value));
        }
        return NextResponse.redirect(url);
      }
      if (role === "employee") {
        return redirect("/dashboard/employee");
      }
    }
  }

  // ── 2a. Employee login page — redirect authenticated users ─────
  if (pathname === "/employee-login") {
    if (user) {
      const role = user.user_metadata?.role;
      if (role === "employee") return redirect("/dashboard/employee");
      if (role === "wholesaler") return redirect("/dashboard/wholesaler");
      if (role === "retailer") return redirect("/dashboard/retailer");
      return redirect("/");
    }
  }

  // ── 3. Protect select-role — must be logged in ───────────────
  if (pathname.startsWith("/select-role") && !user) {
    return redirect("/entry_page/signup");
  }

  // ── 4. New auth sub-routes — must be accessible without login ─
  // /signup/verify-otp, /signup/set-password are pre-auth steps.
  // /join/[code] is the referral landing page — always public (user has no account yet).
  // Allow them through without session checks.
  const preAuthRoutes = [
    "/entry_page/signup/verify-otp",
    "/entry_page/signup/set-password",
    "/auth/callback",
    "/join", // referral landing page — public
    "/employee-login", // employee login page — public
  ];
  if (preAuthRoutes.some((r) => pathname.startsWith(r))) {
    return supabaseResponse;
  }

  // ── 5. Auth pages — redirect authenticated users ─────────────
  const authRoutes = ["/entry_page/signin", "/entry_page/signup"];
  if (authRoutes.some((r) => pathname === r || pathname.startsWith(r + "?")) && user) {
    const role = user.user_metadata?.role;
    if (!role) return redirect("/onboard");
    if (role === "wholesaler") {
      const dest = await getWholesalerDestination(supabase, user.id);
      if (dest.includes("error=banned")) {
        await supabase.auth.signOut();
      }
      const url = request.nextUrl.clone();
      url.pathname = dest.split("?")[0];
      if (dest.includes("?")) {
        const params = new URLSearchParams(dest.split("?")[1]);
        params.forEach((value, key) => url.searchParams.set(key, value));
      }
      return NextResponse.redirect(url);
    }
    if (role === "retailer") {
      const dest = await getRetailerDestination(supabase, user.id, request);
      if (dest.includes("error=banned")) {
        await supabase.auth.signOut();
      }
      const url = request.nextUrl.clone();
      url.pathname = dest.split("?")[0];
      if (dest.includes("?")) {
        const params = new URLSearchParams(dest.split("?")[1]);
        params.forEach((value, key) => url.searchParams.set(key, value));
      }
      return NextResponse.redirect(url);
    }
    if (role === "employee") {
      return redirect("/dashboard/employee");
    }
    return redirect("/");
  }

  return supabaseResponse;
}
