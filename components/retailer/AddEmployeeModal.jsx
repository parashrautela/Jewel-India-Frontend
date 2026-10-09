"use client";

import { useState } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import { validateIndianMobile } from "../../lib/utils/credentials";

const COPY_ICON = "https://res.cloudinary.com/dcs0vuzwg/image/upload/v1777306236/retailerProfile_COPY_szewo3.svg";

const inputClass =
  "w-full h-[56px] bg-[#F8F8F8] rounded-[12px] px-[20px] font-medium text-[15px] text-[#111827] outline-none border border-transparent focus:bg-white focus:border-gray-100 transition-all";

function Field({ label, hint, children }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-[13px] font-bold text-[#111827] uppercase tracking-wide">{label}</label>
      {children}
      {hint && <span className="text-[12px] font-medium text-[#6B7280]">{hint}</span>}
    </div>
  );
}

function CopyField({ label, value, copied, onCopy }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[13px] font-extrabold text-[#4B5563] uppercase tracking-wide">{label}</label>
      <div className="relative">
        <input
          type="text"
          readOnly
          value={value}
          className="w-full h-[56px] bg-[#F9FAFB] rounded-[10px] pl-[16px] pr-[48px] text-[15px] font-bold text-[#111827] outline-none font-mono"
        />
        <button
          type="button"
          onClick={onCopy}
          title="Copy"
          className="absolute right-3 top-1/2 -translate-y-1/2 p-2 hover:bg-gray-200 rounded-md transition-colors"
        >
          <Image src={COPY_ICON} alt="Copy" width={20} height={20} loading="lazy" className="object-contain" />
        </button>
      </div>
      {copied && <span className="text-[12px] font-semibold text-[#166534]">Copied</span>}
    </div>
  );
}

/**
 * Two ways to add staff: a password login (username + password made by the
 * staff-accounts service, shown once) or a Google invitation (they sign in
 * with Google and the store's invitation links them).
 */
function AddEmployeeDialog({ onClose, onChanged }) {
  const [mode, setMode] = useState("password"); // "password" | "google"
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ full_name: "", phone: "", designation: "", google_email: "", username: "" });
  const [domain, setDomain] = useState("");
  const [credentials, setCredentials] = useState(null); // { email, password } — shown once
  const [invited, setInvited] = useState(null);
  const [copied, setCopied] = useState("");

  const update = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    if (error) setError("");
  };

  const copyToClipboard = async (label, text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(""), 1500);
    } catch {
      // Clipboard blocked — the value is on screen to select by hand.
    }
  };

  function detailsProblem({ needEmail }) {
    if (!form.full_name.trim()) return "Enter the employee's name.";
    if (!form.designation.trim()) return "Enter a designation.";
    if (needEmail && !form.google_email.trim()) return "Enter the Google email address they sign in with.";
    if (form.phone.trim() && !validateIndianMobile(form.phone).valid) {
      return "Please enter a valid 10-digit Indian mobile number.";
    }
    return "";
  }

  // Password login, step 1 → 2: ask the service for a free username.
  const handleSuggest = async () => {
    const problem = detailsProblem({ needEmail: false });
    if (problem) { setError(problem); return; }
    setError("");
    setIsLoading(true);
    try {
      const res = await fetch("/api/employees/generate-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name: form.full_name.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.username) {
        setError(data.error || "Couldn't suggest a username.");
        return;
      }
      setForm((prev) => ({ ...prev, username: data.username }));
      setDomain(data.domain);
      setStep(2);
    } catch {
      setError("Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  };

  // Password login, step 2 → 3: the service makes the login and the password.
  const handleCreate = async () => {
    const username = form.username.trim().toLowerCase();
    if (!username) { setError("Enter a username."); return; }
    setError("");
    setIsLoading(true);
    try {
      const res = await fetch("/api/employees/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: form.full_name.trim(),
          username,
          designation: form.designation.trim(),
          phone: form.phone.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || "Failed to create the login.");
        return;
      }
      setCredentials({
        email: data.employee?.email || `${username}@${domain}`,
        password: data.password,
      });
      setStep(3);
    } catch {
      setError("Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  };

  // Google invitation: one step.
  const handleInvite = async () => {
    const problem = detailsProblem({ needEmail: true });
    if (problem) { setError(problem); return; }
    setError("");
    setIsLoading(true);
    try {
      const res = await fetch("/api/employees/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: form.full_name.trim(),
          email: form.google_email.trim(),
          designation: form.designation.trim(),
          phone: form.phone.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || "Failed to send the invitation.");
        return;
      }
      setInvited(data.employee);
      setStep(2);
    } catch {
      setError("Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  };

  const finish = () => {
    onChanged();
    onClose();
  };

  const loginUrl = typeof window !== "undefined" ? `${window.location.origin}/employee-login` : "/employee-login";

  const detailFields = (
    <>
      <Field label="Employee Name">
        <input type="text" placeholder="Eg. Priya Sharma" value={form.full_name} onChange={update("full_name")} className={inputClass} />
      </Field>

      {mode === "google" && (
        <Field label="Google email" hint="The Google account they will sign in with.">
          <input type="email" placeholder="Eg. priya@gmail.com" value={form.google_email} onChange={update("google_email")} className={inputClass} />
        </Field>
      )}

      <Field label="Designation">
        <input type="text" placeholder="Eg. Sales" value={form.designation} onChange={update("designation")} className={inputClass} />
      </Field>

      <Field label="Mobile No (optional)">
        <input
          type="text"
          inputMode="numeric"
          maxLength={10}
          placeholder="Eg. 9834874****"
          value={form.phone}
          onChange={(e) => {
            const val = e.target.value.replace(/\D/g, '').slice(0, 10);
            setForm((prev) => ({ ...prev, phone: val }));
            if (error) setError("");
          }}
          className={inputClass}
        />
      </Field>
    </>
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-[480px] rounded-[16px] border border-white shadow-[0_10px_40px_rgba(0,0,0,0.1)] relative flex flex-col p-6 sm:p-8 max-h-[90vh] overflow-y-auto overscroll-contain">

        {/* Close Button */}
        <button onClick={onClose} className="absolute top-6 right-6 text-[#111827] hover:opacity-70 transition-opacity">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>

        {/* Header */}
        <div className="mb-6">
          <h2 className="text-[24px] font-bold text-[#111827] leading-tight">Add New Employee</h2>
          <p className="text-[15px] text-[#9CA3AF] mt-1">New Member, New Access</p>
        </div>

        {/* Mode — only before anything has been created */}
        {step === 1 && (
          <div className="flex gap-2 mb-6 p-1 bg-[#F3F4F6] rounded-[12px]">
            {[
              { value: "password", label: "Create a login" },
              { value: "google", label: "Invite by Google" },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => { setMode(option.value); setError(""); }}
                className={`flex-1 h-[40px] rounded-[10px] text-[14px] font-bold transition-colors ${
                  mode === option.value ? "bg-white text-[#111827] shadow-sm" : "text-[#6B7280] hover:text-[#111827]"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 text-[13px] font-medium rounded-lg border border-red-100">
            {error}
          </div>
        )}

        {/* ── Password login ── */}
        {mode === "password" && step === 1 && (
          <div className="flex flex-col gap-4">
            {detailFields}
            <div className="mt-6 flex items-center justify-between gap-4">
              <span className="text-[13px] text-[#9CA3AF]">We&apos;ll suggest a username next.</span>
              <button
                onClick={handleSuggest}
                disabled={isLoading}
                className="h-[52px] px-8 bg-black text-white font-bold text-[16px] rounded-[12px] hover:bg-black/90 transition-all shadow-[0_4px_14px_rgba(0,0,0,0.3)] disabled:opacity-70 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {isLoading ? "Loading..." : "Next"}
              </button>
            </div>
          </div>
        )}

        {mode === "password" && step === 2 && (
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-extrabold text-[#4B5563] uppercase tracking-wide">Username</label>
              <div className="flex items-center h-[56px] bg-[#F9FAFB] rounded-[10px] overflow-hidden focus-within:ring-2 focus-within:ring-black/5">
                <input
                  type="text"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  value={form.username}
                  onChange={(e) => {
                    const val = e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, "");
                    setForm((prev) => ({ ...prev, username: val }));
                    if (error) setError("");
                  }}
                  className="flex-1 min-w-0 h-full bg-transparent pl-[16px] text-[15px] font-bold text-[#111827] outline-none font-mono"
                />
                <span className="pr-[16px] text-[14px] font-medium text-[#6B7280] whitespace-nowrap">@{domain}</span>
              </div>
              <span className="text-[12px] font-medium text-[#4B5563] mt-0.5">
                This is only a username. Nothing is ever sent to it.
              </span>
            </div>

            <div className="mt-6 flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => { setStep(1); setError(""); }}
                className="text-[14px] font-medium text-[#6B7280] hover:text-[#111827]"
              >
                Back
              </button>
              <button
                onClick={handleCreate}
                disabled={isLoading}
                className="h-[48px] px-6 bg-black text-white font-medium text-[15px] rounded-[12px] hover:bg-gray-800 shadow-md shadow-black/20 transition-colors disabled:opacity-70"
              >
                {isLoading ? "Creating..." : "Create login"}
              </button>
            </div>
          </div>
        )}

        {mode === "password" && step === 3 && credentials && (
          <div className="flex flex-col gap-6">
            <CopyField
              label="Username"
              value={credentials.email}
              copied={copied === "username"}
              onCopy={() => copyToClipboard("username", credentials.email)}
            />
            <CopyField
              label="Password"
              value={credentials.password}
              copied={copied === "password"}
              onCopy={() => copyToClipboard("password", credentials.password)}
            />

            <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-[10px] p-4">
              <p className="text-[13px] text-[#92400E] leading-relaxed">
                <span className="font-bold">Save these now.</span> The password is shown only this once and isn&apos;t stored anywhere. If it&apos;s lost, reset it from the employee list.
              </p>
            </div>

            <div className="mt-2 flex items-center justify-between gap-4">
              <span className="text-[13px] text-[#9CA3AF]">They sign in at {loginUrl.replace(/^https?:\/\//, "")}</span>
              <button
                onClick={finish}
                className="h-[48px] px-10 bg-black text-white font-medium text-[15px] rounded-[12px] hover:bg-gray-800 shadow-md shadow-black/20 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        )}

        {/* ── Google invitation ── */}
        {mode === "google" && step === 1 && (
          <div className="flex flex-col gap-4">
            {detailFields}
            <div className="mt-6 flex items-center justify-between gap-4">
              <span className="text-[13px] text-[#9CA3AF]">No password — they sign in with Google.</span>
              <button
                onClick={handleInvite}
                disabled={isLoading}
                className="h-[52px] px-8 bg-black text-white font-bold text-[16px] rounded-[12px] hover:bg-black/90 transition-all shadow-[0_4px_14px_rgba(0,0,0,0.3)] disabled:opacity-70 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {isLoading ? "Inviting..." : "Invite"}
              </button>
            </div>
          </div>
        )}

        {mode === "google" && step === 2 && invited && (
          <div className="flex flex-col gap-5">
            <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-[10px] p-4">
              <p className="text-[14px] font-bold text-[#1E3A8A]">{invited.full_name} is invited.</p>
              <p className="text-[13px] text-[#1D4ED8] leading-relaxed mt-1">
                Ask them to open the employee login page and choose <span className="font-bold">Continue with Google</span> with{" "}
                <span className="font-bold">{invited.invite_email || invited.email}</span>. Their access starts the moment they sign in.
              </p>
            </div>

            <CopyField
              label="Employee login page"
              value={loginUrl}
              copied={copied === "link"}
              onCopy={() => copyToClipboard("link", loginUrl)}
            />

            <div className="mt-2 flex justify-end">
              <button
                onClick={finish}
                className="h-[48px] px-10 bg-black text-white font-medium text-[15px] rounded-[12px] hover:bg-gray-800 shadow-md shadow-black/20 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default function AddEmployeeModal() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const isOpen = searchParams.get("modal") === "add-employee";

  if (!isOpen) return null;

  const closeModal = () => {
    router.replace(pathname, { scroll: false });
  };

  // The employees page listens for this and refetches its list.
  const notifyChanged = () => {
    window.dispatchEvent(new CustomEvent("employees:changed"));
    router.refresh();
  };

  // Mounted only while open, so every opening starts from a clean form.
  return <AddEmployeeDialog onClose={closeModal} onChanged={notifyChanged} />;
}
