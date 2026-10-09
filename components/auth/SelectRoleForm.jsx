"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "../ui/Button";
import { setUserRole, claimStaffInvite } from "../../lib/actions/role";
import { useInviteCode } from "../../lib/hooks/useInviteCode";

const roles = [
  {
    value: "wholesaler",
    label: "I'm a wholesaler",
    description: "Upload jewellery products, manage your catalogue, and connect with retailers.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
      </svg>
    ),
  },
  {
    value: "retailer",
    label: "I'm a retailer",
    description: "Browse the full jewellery catalogue and source from wholesalers. You'll need the invitation code a wholesaler sent you.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
      </svg>
    ),
  },
  {
    value: "staff",
    label: "I work at a store",
    description: "Your store owner added your Google address to their staff list. Works for Google sign-ins only.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
      </svg>
    ),
  },
];
export function SelectRoleForm() {
  const [selected, setSelected] = useState(null);
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const router = useRouter();

  // Checked live as it is typed; only a live code lets the retailer door open.
  const invite = useInviteCode(selected === "retailer" ? inviteCode : "");
  const needsCode = selected === "retailer" && invite.status !== "valid";

  async function handleConfirm() {
    if (!selected) {
      setError("Please choose a role to continue.");
      return;
    }
    if (needsCode) {
      setError(invite.status === "invalid" ? invite.message : "Enter your invitation code.");
      return;
    }
    setLoading(true);
    setError(null);

    // Staff are not a role you pick: the invitation is matched on the Google address.
    if (selected === "staff") {
      const result = await claimStaffInvite();
      if (result?.error) {
        setError(result.error);
        setLoading(false);
        return;
      }
      router.push("/dashboard/employee");
      return;
    }

    const result = await setUserRole(selected);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
      return;
    }
    // Redirect based on role
    if (selected === "wholesaler") {
      router.push("/dashboard/wholesaler");
    } else {
      // The onboarding submit reads the code from here.
      sessionStorage.setItem("referral_code", invite.code);
      sessionStorage.setItem("referral_role", "retailer");
      router.push("/");
    }
  }

  function inviteStatusLine() {
    if (invite.status === "checking") return { text: "Checking your code…", tone: "text-celestique-dark/40" };
    if (invite.status === "valid") return { text: `Invited by ${invite.wholesalerName}`, tone: "text-celestique-dark" };
    if (invite.status === "invalid") return { text: invite.message, tone: "text-red-800" };
    return null;
  }

  const statusLine = inviteStatusLine();

  return (
    <div className="w-full space-y-8">
      <div className="grid gap-6">
        {roles.map((role) => {
          const isSelected = selected === role.value;
          return (
            <div key={role.value}>
              <button
                type="button"
                onClick={() => { setSelected(role.value); setError(null); }}
                className={`
                  relative w-full text-left flex items-start gap-6 p-6 border transition-all duration-300
                  ${isSelected
                    ? "border-celestique-dark bg-celestique-taupe/10"
                    : "border-celestique-taupe bg-transparent hover:border-celestique-dark/50 hover:bg-celestique-taupe/5"}
                `}
              >
                {/* Radio indicator */}
                <div
                  className={`
                    mt-1 shrink-0 w-4 h-4 border flex items-center justify-center transition-colors
                    ${isSelected ? "border-celestique-dark bg-celestique-dark" : "border-celestique-taupe bg-transparent"}
                  `}
                >
                  {isSelected && (
                    <span className="w-1.5 h-1.5 bg-celestique-cream inline-block" />
                  )}
                </div>

                {/* Icon */}
                <div className={`shrink-0 p-3 border ${isSelected ? "border-celestique-dark text-celestique-dark" : "border-celestique-taupe text-celestique-dark/60"}`}>
                  {role.icon}
                </div>

                {/* Text */}
                <div className="pt-1">
                  <p className={`font-serif text-lg ${isSelected ? "text-celestique-dark" : "text-celestique-dark/80"}`}>
                    {role.label}
                  </p>
                  <p className="font-sans text-[11px] uppercase tracking-[0.1em] text-celestique-dark/60 mt-2 leading-relaxed">
                    {role.description}
                  </p>
                </div>
              </button>

              {/* Invitation code — a retailer can't go further without one */}
              {isSelected && role.value === "retailer" && (
                <div className="border border-t-0 border-celestique-dark bg-celestique-taupe/10 px-6 pb-6 pt-4">
                  <label
                    htmlFor="invite-code"
                    className="block font-sans text-[10px] uppercase tracking-[0.2em] text-celestique-dark/60 mb-2"
                  >
                    Invitation code
                  </label>
                  <input
                    id="invite-code"
                    type="text"
                    autoComplete="off"
                    autoCapitalize="characters"
                    spellCheck={false}
                    placeholder="The code your wholesaler sent you"
                    value={inviteCode}
                    onChange={(e) => { setInviteCode(e.target.value.toUpperCase()); setError(null); }}
                    className="w-full h-12 border border-celestique-taupe bg-celestique-cream px-4 font-mono text-sm tracking-[0.15em] text-celestique-dark placeholder:font-sans placeholder:tracking-normal placeholder:text-celestique-dark/30 focus:outline-none focus:border-celestique-dark transition-colors"
                  />
                  {statusLine && (
                    <p className={`font-sans text-[10px] uppercase tracking-[0.1em] mt-3 ${statusLine.tone}`}>
                      {statusLine.text}
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {error && (
        <p className="font-sans text-[10px] uppercase tracking-[0.1em] text-red-800 bg-red-50 border border-red-200 px-4 py-3 text-center">
          {error}
        </p>
      )}

      <Button
        onClick={handleConfirm}
        loading={loading}
        disabled={!selected || needsCode}
      >
        {selected === "staff" ? "Find my store" : "Complete Selection"}
      </Button>
    </div>
  );
}
