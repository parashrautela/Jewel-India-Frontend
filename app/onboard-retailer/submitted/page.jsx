import { OnboardLayout } from "../../../components/onboard/OnboardLayout";
import { VerificationTimeline } from "../../../components/onboard/submitted/VerificationTimeline";
import { SubmittedFooter } from "../../../components/onboard/submitted/SubmittedFooter";
import { StepIndicator } from "../../../components/onboard/StepIndicator";
import { createClient } from "../../../lib/supabase/server";
import { redirect } from "next/navigation";
import { SignOutButton as OnboardSignOutButton } from "../../../components/auth/SignOutButton";
import { AttachInvitationCode } from "../../../components/onboard-retailer/submitted/AttachInvitationCode";

export const metadata = { title: "Verification Pending — Retailer" };

export default async function RetailerSubmittedPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/entry_page/signup");
  }

  const { data: retailer } = await supabase
    .from("retailers")
    .select("verification_status, referred_by, created_at, updated_at, rejection_reason, rejected_documents")
    .eq("user_id", user.id)
    .single();

  if (!retailer) {
    redirect("/onboard-retailer"); // They haven't finished the form
  }

  if (retailer.verification_status === "verified") {
    redirect("/dashboard/employee");
  }

  const timeSubmitted = new Date(retailer.created_at).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true
  });

  // Document name mapping function for display
  const mapDocumentName = (docKey) => {
    const mapping = {
      aadhaar_front: "Aadhaar Card (Front)",
      aadhaar_back: "Aadhaar Card (Back)",
      pan_card: "PAN Card",
      gst_certificate: "GST Certificate",
      business_logo: "Business Logo",
      aadhaar_front_url: "Aadhaar Card (Front)",
      aadhaar_back_url: "Aadhaar Card (Back)",
      pan_card_url: "PAN Card",
      gst_certificate_url: "GST Certificate",
      business_logo_url: "Business Logo"
    };
    if (mapping[docKey]) return mapping[docKey];
    return docKey
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const hasRejectedDocs = Array.isArray(retailer.rejected_documents) && retailer.rejected_documents.length > 0;
  const cleanRejectedDocs = hasRejectedDocs ? retailer.rejected_documents.map(mapDocumentName) : [];

  return (
    <div className="theme-retailer min-h-screen bg-[#FFFFFF] flex flex-col font-sans antialiased text-[#374151]">
      <header className="w-full bg-[#FFFFFF] border-b border-[#E0E0E0] px-[clamp(16px,3vw,48px)] py-[clamp(6px,0.8vw,12px)] flex items-center justify-between shadow-sm z-10">
        <div className="flex items-center gap-2">
          <img src="/jewelLogo.svg" alt="Jewels India Logo" className="w-[wrap(24px,3vw,28px)] h-auto object-contain" />
          <span className="text-[clamp(13px,1.5vw,15px)] font-bold text-[#111827]">Jewels India</span>
        </div>
        <OnboardSignOutButton />
      </header>

      <main className="onboard-page-transition flex-1 w-full max-w-[800px] mx-auto px-[clamp(16px,3vw,48px)] pt-[clamp(32px,5vw,60px)] pb-12 flex flex-col items-center">
        
        {/* Step progress indicator for retailer application completed */}
        <div className="w-full max-w-[500px] mb-12">
          <StepIndicator currentStep={4} totalSteps={3} />
        </div>

        {retailer.verification_status === 'pending' && (
          <div className="w-full flex justify-center mb-8">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" className="text-amber-500">
              <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" fill="currentColor" fillOpacity="0.2"/>
              <path d="M12 8V13L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        )}

        <h1 className="text-[clamp(24px,3vw,32px)] font-extrabold text-[#111827] text-center mb-3">
          {retailer.verification_status === 'pending' ? 'Application under review' :
           retailer.verification_status === 'rejected' ? 'Application Rejected' :
           retailer.verification_status === 'on_hold' ? 'Application On Hold' :
           retailer.verification_status === 'resubmission_required' ? 'Action Required' : 'Status Update'}
        </h1>
        
        <p className="text-[15px] text-[#6B7280] text-center max-w-[500px] mb-12 leading-relaxed">
          {retailer.verification_status === 'pending' ? "We've received your business details and documents. Our team is verifying your application right now. This usually takes 24-48 hours." :
           retailer.verification_status === 'rejected' ? retailer.rejection_reason || "Unfortunately, your application did not meet our requirements." :
           retailer.verification_status === 'on_hold' ? "Your application requires manual review and is currently on hold. We will reach out shortly." :
           retailer.verification_status === 'resubmission_required' ? "We need you to update some information or re-upload documents before we can proceed." : ""}
        </p>

        <div className="w-full max-w-[500px] bg-[#F9FAFB] border border-[#E5E7EB] rounded-[16px] p-6 md:p-8">
          <VerificationTimeline
            status={retailer.verification_status}
            submittedAt={timeSubmitted}
            updatedAt={retailer.updated_at}
          />
        </div>

        {/* No inviter yet (applied before invitations were required): nobody is verified without one */}
        {!retailer.referred_by && <AttachInvitationCode />}

        {/* Rejection / Revision Details Box */}
        {(retailer.verification_status === "rejected" || retailer.verification_status === "resubmission_required") && (
          <div className="w-full max-w-[500px] mt-6 p-5 bg-red-50/40 border border-red-200/60 rounded-2xl flex flex-col gap-4 text-left">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-red-100/70 text-red-600 rounded-xl mt-0.5 shrink-0">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h4 className="text-[14.5px] font-bold text-red-950">
                  {retailer.verification_status === "rejected" ? "Application Rejected" : "Revision Required"}
                </h4>
                <p className="text-[13.5px] text-red-800/90 mt-1 leading-relaxed">
                  {retailer.rejection_reason || "There was an issue with your submission. Please check the details below and resubmit."}
                </p>
              </div>
            </div>

            {hasRejectedDocs && (
              <div className="border-t border-red-200/50 pt-4">
                <h5 className="text-[12px] font-bold uppercase tracking-wider text-red-950/70">
                  Items to Resubmit:
                </h5>
                <ul className="mt-2.5 flex flex-col gap-2">
                  {cleanRejectedDocs.map((docName, idx) => (
                    <li key={idx} className="flex items-center gap-2.5 text-[13px] text-red-900 font-semibold bg-red-100/30 border border-red-200/50 rounded-xl px-3.5 py-2">
                      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-red-500 shrink-0">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      {docName}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <SubmittedFooter />
      </main>
    </div>
  );
}
