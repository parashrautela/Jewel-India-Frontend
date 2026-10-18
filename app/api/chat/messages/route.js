import { NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase/server";
import { supabaseAdmin } from "../../../../lib/supabase/admin";
import { assertFeature } from "../../../../lib/featureFlags.js";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const conversation_id = searchParams.get("conversation_id");

    if (!conversation_id) {
      return NextResponse.json({ error: "conversation_id is required" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: conv, error: convErr } = await supabaseAdmin
      .from("conversations")
      .select("*")
      .eq("id", conversation_id)
      .single();

    if (convErr || !conv) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    const role = user.user_metadata?.role;
    let hasAccess = false;

    if (role === "employee") {
      const { data: emp } = await supabase.from("employees").select("id").eq("auth_user_id", user.id).single();
      if (emp && emp.id === conv.employee_id) hasAccess = true;
    } else if (role === "wholesaler") {
      const { data: ws } = await supabase.from("wholesalers").select("id").eq("user_id", user.id).single();
      if (ws && user.id === conv.wholesaler_id) hasAccess = true;
    } else if (role === "retailer") {
      const { data: ret } = await supabase.from("retailers").select("id").eq("user_id", user.id).single();
      if (ret && ret.id === conv.retailer_id) hasAccess = true;
    }

    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden access to conversation" }, { status: 403 });
    }

    const { data: messages, error: msgErr } = await supabaseAdmin
      .from("messages")
      .select("*")
      .eq("conversation_id", conversation_id)
      .order("created_at", { ascending: true });

    if (msgErr) throw msgErr;

    return NextResponse.json({ data: messages });
  } catch (error) {
    console.error("[GET /api/chat/messages] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { conversation_id, content } = body;

    if (!conversation_id || !content) {
      return NextResponse.json({ error: "conversation_id and content are required" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check conversation access
    const { data: conv, error: convErr } = await supabaseAdmin
      .from("conversations")
      .select("*")
      .eq("id", conversation_id)
      .single();

    if (convErr || !conv) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    const role = user.user_metadata?.role;
    let hasAccess = false;
    let senderType = "";

    if (role === "employee") {
      const { data: emp } = await supabase.from("employees").select("id").eq("auth_user_id", user.id).single();
      if (emp && emp.id === conv.employee_id) {
        hasAccess = true;
        senderType = "employee";
      }
    } else if (role === "wholesaler") {
      const { data: ws } = await supabase.from("wholesalers").select("id").eq("user_id", user.id).single();
      if (ws && user.id === conv.wholesaler_id) {
        hasAccess = true;
        senderType = "wholesaler";
      }
    }

    if (!hasAccess || !senderType) {
      return NextResponse.json({ error: "Forbidden to send message in this conversation" }, { status: 403 });
    }

    // Feature check placed AFTER access check so unauthorized callers learn nothing
    const blockedResponse = await assertFeature(
      supabaseAdmin,
      conv.wholesaler_id,
      "messages",
      "Messaging is not available for this supplier right now."
    );
    if (blockedResponse) {
      return blockedResponse;
    }

    const { data: newMessage, error: insertError } = await supabaseAdmin
      .from("messages")
      .insert({
        conversation_id,
        content,
        sender_type: senderType,
        sender_id: user.id, // Using auth.users.id
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // Update conversation's updated_at
    await supabaseAdmin
      .from("conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", conversation_id);

    return NextResponse.json({ data: newMessage });
  } catch (error) {
    console.error("[POST /api/chat/messages] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
