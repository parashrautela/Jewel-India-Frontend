import { createClient } from "../../../lib/supabase/server";
import { NextResponse } from "next/server";
import { getWholesalerDestination } from "../../../lib/actions/auth";
import { messageForDbError } from "../../../lib/utils/dbMessages";

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code  = searchParams.get("code");
  const oauthError = searchParams.get("error");

  // Staff start from /employee-login; everyone else from the entry page.
  const isStaff = searchParams.get("staff") === "1";
  const errorPage = isStaff ? "/employee-login" : "/entry_page/signup";

  function redirectWithError(message) {
    const url = new URL(`${origin}${errorPage}`);
    url.searchParams.set("error", message);
    return NextResponse.redirect(url.toString());
  }

  if (oauthError) {
    const description = searchParams.get("error_description") ?? oauthError;
    return redirectWithError(description);
  }
  if (code) {
    const supabase = await createClient();
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      return redirectWithError(exchangeError.message);
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Password-recovery links carry `next`; honour it whatever the role.
    const next = searchParams.get("next");
    if (next) {
      return NextResponse.redirect(`${origin}${next}`);
    }

    // Try metadata first (fastest — from JWT)
    let role = user?.user_metadata?.role;

    // Fallback: query profiles table if metadata is empty
    if (!role && user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();
      role = profile?.role;
    }

    // No role: this account has not been through a door yet.
    if (!role) {
      // Staff door — the invitation is matched on the provider's email address.
      if (isStaff) {
        const { error: claimError } = await supabase.rpc("claim_staff_invite");
        if (claimError) {
          // Nothing to link this account to; don't leave a roleless session behind.
          await supabase.auth.signOut();
          return redirectWithError(
            messageForDbError(claimError, "We couldn't link this account to a store. Use the email address your store invited.")
          );
        }
        return NextResponse.redirect(`${origin}/dashboard/employee`);
      }

      const requestedRole = searchParams.get("role");
      const referralCode = searchParams.get("ref");

      // Retailer door — only with an invitation in hand; otherwise
      // /select-role asks for one before the role is set.
      if (requestedRole === "retailer" && referralCode) {
        const { error: roleError } = await supabase.rpc("set_my_role", { p_role: "retailer" });
        if (roleError) {
          return redirectWithError(messageForDbError(roleError, roleError.message));
        }
        return NextResponse.redirect(`${origin}/onboard-retailer`);
      }

      if (requestedRole === "wholesaler") {
        const { error: roleError } = await supabase.rpc("set_my_role", { p_role: "wholesaler" });
        if (roleError) {
          return redirectWithError(messageForDbError(roleError, roleError.message));
        }
        return NextResponse.redirect(`${origin}/onboard`);
      }

      return NextResponse.redirect(`${origin}/select-role`);
    }

    if (role === "wholesaler") {
      const dest = await getWholesalerDestination(user.id);
      if (dest.includes("error=banned")) {
        await supabase.auth.signOut();
      }
      return NextResponse.redirect(`${origin}${dest}`);
    }

    if (role === "retailer") {
      return NextResponse.redirect(`${origin}/`); // Will be caught by middleware and handled
    }

    if (role === "employee") {
      return NextResponse.redirect(`${origin}/dashboard/employee`);
    }

    return NextResponse.redirect(`${origin}/select-role`);
  }

  // No code and no error — unexpected state
  return NextResponse.redirect(`${origin}/entry_page/signup?error=oauth`);
}
