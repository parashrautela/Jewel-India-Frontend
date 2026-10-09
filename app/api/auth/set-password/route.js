import { NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase/server";
import { messageForDbError } from "../../../../lib/utils/dbMessages";

/**
 * POST /api/auth/set-password
 * Body: { password: string, role?: "wholesaler" | "retailer" }
 *
 * Called after OTP verification (user is now signed in via OTP session).
 * Updates the user's password, then records the door they came through with
 * set_my_role(). Nothing is assumed: an account that chose no door is sent
 * to /select-role by the middleware.
 * Returns: { success, role } or { error }
 */
export async function POST(request) {
  try {
    const { password, role: requestRole } = await request.json();

    if (!password) {
      return NextResponse.json({ error: "Password is required." }, { status: 400 });
    }

    const chosenRole = ["wholesaler", "retailer"].includes(requestRole) ? requestRole : null;

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
    if (!passwordRegex.test(password)) {
      return NextResponse.json(
        {
          error:
            "Password must be at least 8 characters and include 1 uppercase, 1 lowercase, 1 number, and 1 special character.",
        },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Verify the user is currently signed in (via OTP session)
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Session expired. Please restart the signup process." },
        { status: 401 }
      );
    }

    // Update the user's password
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      console.error("[set-password] updateUser error:", updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // The role is chosen, never defaulted. set_my_role() runs as the user and
    // is the only way to record it; metadata writes are pinned by the database.
    if (chosenRole) {
      const { error: roleError } = await supabase.rpc("set_my_role", { p_role: chosenRole });

      if (roleError) {
        console.error("[set-password] set_my_role error:", roleError);
        return NextResponse.json(
          { error: messageForDbError(roleError, roleError.message) },
          { status: 400 }
        );
      }
    }

    return NextResponse.json({ success: true, role: chosenRole });
  } catch (err) {
    console.error("[set-password] unexpected error:", err);
    return NextResponse.json({ error: "Server error. Please try again." }, { status: 500 });
  }
}
