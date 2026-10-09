import { supabaseAdmin } from "../../../../lib/supabase/admin.js";
import { createClient } from "../../../../lib/supabase/server.js";
import { NextResponse } from "next/server";
import { DB_MESSAGES, messageForDbError } from "../../../../lib/utils/dbMessages";

export const runtime = "nodejs";

export async function POST(req) {
  try {
    const supabaseServer = await createClient();
    const { data: { user }, error: authError } = await supabaseServer.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: `Unauthorized — ${authError?.message || "Please sign in again"}` },
        { status: 401 }
      );
    }

    const uid = user.id;
    const formData = await req.formData();
    const fullName = formData.get("name") || "";
    const aadharNumber = formData.get("aadhar") || "";
    const businessName = formData.get("businessName") || "";
    const state = formData.get("state") || "";
    const city = formData.get("city") || "";
    const referralCode = String(formData.get("referralCode") || "").trim().toUpperCase() || null;

    const aadharFront = formData.get("aadharFront");
    const aadharBack = formData.get("aadharBack");
    const panCard = formData.get("panCard");
    const gstCertificate = formData.get("gstCertificate");
    const businessLogo = formData.get("businessLogo");

    // A first application needs the invitation; a resubmission keeps the one
    // already on the row (the database pins referral_code and referred_by).
    // Checked before the documents are uploaded so a missing code costs nothing.
    const { data: existingRetailer } = await supabaseAdmin
      .from("retailers")
      .select("id")
      .eq("user_id", uid)
      .maybeSingle();

    if (!existingRetailer && !referralCode) {
      return NextResponse.json(
        { error: DB_MESSAGES.INVITE_CODE_REQUIRED },
        { status: 400 }
      );
    }

    async function uploadFile(bucket, filePath, file) {
      if (!file || !(file instanceof File)) return null;

      const buffer = Buffer.from(await file.arrayBuffer());
      const { data, error } = await supabaseAdmin.storage
        .from(bucket)
        .upload(filePath, buffer, {
          contentType: file.type,
          upsert: true,
        });

      if (error) {
        console.error("Upload error [" + bucket + "/" + filePath + "]:", error.message);
        return null;
      }

      const { data: urlData } = supabaseAdmin.storage
        .from(bucket)
        .getPublicUrl(data.path);

      return urlData?.publicUrl || null;
    }

    const timestamp = Date.now();
    const [
      aadharFrontUrl,
      aadharBackUrl,
      panCardUrl,
      gstCertificateUrl,
      businessLogoUrl,
    ] = await Promise.all([
      uploadFile("aadhaar-documents", uid + "/aadhaar-front-" + timestamp, aadharFront),
      uploadFile("aadhaar-documents", uid + "/aadhaar-back-" + timestamp, aadharBack),
      uploadFile("pan-documents", uid + "/pan-card-" + timestamp, panCard),
      uploadFile("gst-documents", uid + "/gst-certificate-" + timestamp, gstCertificate),
      uploadFile("business-logos", uid + "/business-logo-" + timestamp, businessLogo),
    ]);

    const retailerRow = {
      user_id: uid,
      email: user.email,
      full_name: fullName,
      aadhar_number: aadharNumber,
      business_name: businessName,
      state: state,
      city: city,
      aadhaar_front_url: aadharFrontUrl,
      aadhaar_back_url: aadharBackUrl,
      pan_card_url: panCardUrl,
      gst_certificate_url: gstCertificateUrl,
      business_logo_url: businessLogoUrl,
      verification_status: "pending",
    };

    // On a new row the insert trigger checks and spends the code and sets
    // referred_by itself; clients never write the inviter.
    if (!existingRetailer) {
      retailerRow.referral_code = referralCode;
    }

    const { data: retailer, error: dbError } = await supabaseAdmin
      .from("retailers")
      .upsert(retailerRow, { onConflict: "user_id" })
      .select()
      .single();

    if (dbError) {
      console.error("DB insert error:", dbError.message);
      const inviteProblem = /INVITE_CODE_/.test(dbError.message || "");
      return NextResponse.json(
        { error: inviteProblem ? messageForDbError(dbError) : dbError.message },
        { status: inviteProblem ? (dbError.message.includes("INVITE_CODE_REQUIRED") ? 400 : 409) : 500 }
      );
    }

    return NextResponse.json({ success: true, data: retailer });
  } catch (err) {
    console.error("Onboard retailer submit error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
