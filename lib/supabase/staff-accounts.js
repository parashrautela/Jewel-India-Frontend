import { NextResponse } from "next/server";
import { createClient } from "./server";

const FUNCTION_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/staff-accounts`;

/**
 * Calls the staff-accounts Edge Function as the signed-in store owner.
 * Creating a login needs the service role, so that work lives there; this
 * only forwards the caller's own access token and returns what it says.
 *
 * Returns { status, body } where body is the function's JSON:
 * { ok: true, ... } or { ok: false, error, message } (message is safe to show).
 */
export async function callStaffAccounts(action, payload = {}) {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    return {
      status: 401,
      body: { ok: false, error: "not_signed_in", message: "Please sign in again." },
    };
  }

  let res;
  try {
    res = await fetch(FUNCTION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ action, ...payload }),
      cache: "no-store",
    });
  } catch (err) {
    console.error(`[staff-accounts] ${action}: unreachable`, err);
    return {
      status: 502,
      body: { ok: false, error: "unreachable", message: "The staff service couldn't be reached. Please try again." },
    };
  }

  let body;
  try {
    body = await res.json();
  } catch {
    body = { ok: false, error: "bad_response", message: "The staff service sent an unreadable reply." };
  }

  // A gateway error (expired token, function missing) has no {ok:false} shape.
  if (!res.ok && body?.ok !== false) {
    body = {
      ok: false,
      error: body?.error || `http_${res.status}`,
      message: typeof body?.message === "string" ? body.message : "The staff service refused this request.",
    };
  }

  return { status: res.status, body };
}

/**
 * Turns a callStaffAccounts() result into the route's JSON response. On
 * failure the function's `message` becomes `error`, which is what the
 * employees page shows.
 */
export function staffAccountsResponse({ status, body }) {
  if (body?.ok) {
    return NextResponse.json(body);
  }
  const httpStatus = status >= 400 && status < 600 ? status : 500;
  return NextResponse.json(
    {
      ok: false,
      error: body?.message || "Something went wrong. Please try again.",
      code: body?.error || null,
    },
    { status: httpStatus }
  );
}
