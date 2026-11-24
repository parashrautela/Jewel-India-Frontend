"use client";

import { useState, useMemo, useDeferredValue } from "react";


const STATUS_CHIPS = {
  active: { label: "Active", className: "bg-[#dcfce7] text-[#15803d]" },
  invited: { label: "Invited", className: "bg-[#dbeafe] text-[#1d4ed8]" },
  inactive: { label: "Inactive", className: "bg-[#fef3c7] text-[#b45309]" },
};

const chipFor = (emp) => STATUS_CHIPS[emp.status] || STATUS_CHIPS.inactive;

const initialsOf = (name) => name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "?";

// Soft radial avatar backgrounds from the Figma employee rows.
const AVATARS = [
  { border: "0.2px solid #60a5e8", background: "radial-gradient(circle, #ffffff 0%, #f1f4c6 85%, #ffffff 100%)" },
  { border: "0.2px solid #d0d0d0", background: "radial-gradient(circle, #fea7fe 0%, #fed3fe 35%, #ffffff 70%)" },
  { border: "0.2px solid #cacaca", background: "radial-gradient(circle, #cdfedd 0%, #ffffff 60%)" },
];

export function EmployeeTable({ employees, onToggleStatus, onDelete, onUpdate }) {
  const [deletingId, setDeletingId] = useState(null);
  const [togglingId, setTogglingId] = useState(null);
  const [searchInput, setSearchInput] = useState("");
  const [actionsEmployee, setActionsEmployee] = useState(null);

  const [editDesignation, setEditDesignation] = useState("");
  const [isUpdatingDesignation, setIsUpdatingDesignation] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // A freshly reset password: shown once, gone when the modal closes.
  const [isResetting, setIsResetting] = useState(false);
  const [newPassword, setNewPassword] = useState(null);
  const [actionError, setActionError] = useState("");
  const [copied, setCopied] = useState("");

  // Defer search value to keep filter non-blocking during re-renders
  const search = useDeferredValue(searchInput);

  // Memoize filtered list so it's not recomputed on every render
  const filteredEmployees = useMemo(() => {
    const q = search.toLowerCase();
    return employees.filter(emp =>
      !q ||
      emp.full_name?.toLowerCase().includes(q) ||
      emp.email?.toLowerCase().includes(q)
    );
  }, [employees, search]);

  const handleToggle = async (emp) => {
    setTogglingId(emp.id);
    const newStatusIsActive = emp.status !== "active";
    await onToggleStatus(emp.id, newStatusIsActive);
    setTogglingId(null);
  };

  const handleDelete = async (id) => {
    setDeletingId(id);
    await onDelete(id);
    setDeletingId(null);
    setShowDeleteConfirm(false);
    if (actionsEmployee?.id === id) {
      setActionsEmployee(null);
    }
  };

  const openActions = (emp) => {
    setActionsEmployee(emp);
    setEditDesignation(emp.designation || "");
    setActionError("");
    setNewPassword(null);
  };

  const closeActions = () => {
    setActionsEmployee(null);
    setShowDeleteConfirm(false);
    setNewPassword(null);
    setActionError("");
  };

  const handleApplyDesignation = async () => {
    if (!actionsEmployee || editDesignation === actionsEmployee.designation) return;
    setIsUpdatingDesignation(true);
    try {
      const res = await fetch(`/api/employees/${actionsEmployee.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ designation: editDesignation }),
      });
      if (!res.ok) throw new Error("Failed to update designation");
      if (onUpdate) onUpdate(); // Refresh parent
      closeActions();
    } catch (err) {
      alert(err.message);
    } finally {
      setIsUpdatingDesignation(false);
    }
  };

  // The store owner resets a forgotten password; the new one is shown once.
  const handleResetPassword = async () => {
    if (!actionsEmployee) return;
    setIsResetting(true);
    setActionError("");
    try {
      const res = await fetch(`/api/employees/${actionsEmployee.id}/reset-password`, { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Failed to reset the password");
      setNewPassword(data.password);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setIsResetting(false);
    }
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

  const getPastelColor = (name) => {
    const colors = ["#fef3c7", "#e0e7ff", "#dcfce7", "#fce7f3", "#f3e8ff"];
    return colors[(name?.charCodeAt(0) || 0) % colors.length];
  };

  // The row-level button: switch a login on/off, or withdraw an invitation.
  const renderPrimaryAction = (emp, className) => {
    if (emp.is_system_generated) {
      return <span className="text-[13px] font-medium text-[#9CA3AF]">Owner</span>;
    }
    if (emp.status === "invited") {
      return (
        <button
          onClick={() => handleDelete(emp.id)}
          disabled={deletingId === emp.id}
          className={className}
        >
          {deletingId === emp.id ? "Cancelling..." : "Cancel invitation"}
        </button>
      );
    }
    return (
      <button
        onClick={() => handleToggle(emp)}
        disabled={togglingId === emp.id}
        className={className}
      >
        {emp.status === "active" ? "Deactivate" : "Activate"}
      </button>
    );
  };

  const moreIcon = (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 14C13.1046 14 14 13.1046 14 12C14 10.8954 13.1046 10 12 10C10.8954 10 10 10.8954 10 12C10 13.1046 10.8954 14 12 14Z" />
      <path d="M19 14C20.1046 14 21 13.1046 21 12C21 10.8954 20.1046 10 19 10C17.8954 10 17 10.8954 17 12C17 13.1046 17.8954 14 19 14Z" />
      <path d="M5 14C6.10457 14 7 13.1046 7 12C7 10.8954 6.10457 10 5 10C3.89543 10 3 10.8954 3 12C3 13.1046 3.89543 14 5 14Z" />
    </svg>
  );

  const isOwnerRow = actionsEmployee?.is_system_generated === true;
  const isInvitedRow = actionsEmployee?.status === "invited";
  const canResetPassword = actionsEmployee && !isOwnerRow && !isInvitedRow && actionsEmployee.join_method !== "google";

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Search Input */}
      <div className="relative w-full">
        <img src="/retailer-admin/search.svg" alt="" width={20} height={20} className="absolute left-[12px] top-[8px] pointer-events-none" />
        <input
          type="text"
          placeholder="Search employees by name or email..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="w-full h-[36px] bg-white border border-[#e2e8f0] rounded-[12px] pl-[40px] pr-[12px] text-[14px] tracking-[-0.15px] text-[#0f172b] placeholder-[#717182] outline-none focus:border-[#94a3b8]"
        />
      </div>

      {/* Employee Table - Desktop/Tablet */}
      <div className="bg-white border border-[#e2e8f0] rounded-[24px] hidden md:block min-h-[615px] px-[32px] pt-px">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left border-collapse">
            <thead>
              <tr className="border-b border-[rgba(0,0,0,0.1)] h-[40px]">
                {["Employee", "Contact", "Role", "Status", "Last Active"].map((h) => (
                  <th key={h} className="px-[8px] text-[14px] font-medium tracking-[-0.15px] text-[#0a0a0a]">{h}</th>
                ))}
                <th className="px-[8px] text-[14px] font-medium tracking-[-0.15px] text-[#0a0a0a] text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.map((emp, i) => {
                const chip = chipFor(emp);
                return (
                  <tr key={emp.id} className="border-b border-[rgba(0,0,0,0.1)] last:border-b-0 h-[57px]">
                    <td className="px-[8px] whitespace-nowrap">
                      <div className="flex items-center gap-[12px]">
                        <div
                          className="w-[40px] h-[40px] rounded-full flex items-center justify-center shrink-0 text-[16px] font-medium text-white [text-shadow:0_1px_4px_rgba(0,0,0,0.63)]"
                          style={AVATARS[i % AVATARS.length]}
                        >
                          {initialsOf(emp.full_name)}
                        </div>
                        <span className="text-[14px] font-medium tracking-[-0.15px] text-[#0f172b]">{emp.full_name}</span>
                      </div>
                    </td>
                    <td className="px-[8px] whitespace-nowrap">
                      <div className="flex flex-col leading-[20px] text-[14px] tracking-[-0.15px]">
                        <span className="text-[#0f172b]">{emp.email}</span>
                        <span className="text-[#62748e]">
                          {emp.phone || (emp.join_method === "google" ? "Signs in with Google" : "Signs in with a password")}
                        </span>
                      </div>
                    </td>
                    <td className="px-[8px] whitespace-nowrap text-[14px] tracking-[-0.15px] text-[#314158]">{emp.designation}</td>
                    <td className="px-[8px] whitespace-nowrap">
                      <span className={`inline-flex items-center px-[8px] py-[4px] rounded-[6px] text-[12px] leading-[16px] font-medium tracking-[0.24px] ${chip.className}`}>
                        {chip.label}
                      </span>
                    </td>
                    <td className="px-[8px] whitespace-nowrap text-[14px] tracking-[-0.15px] text-[#62748e]">
                      {emp.last_active_at ? emp.last_active_at : "---"}
                    </td>
                    <td className="px-[8px] whitespace-nowrap">
                      <div className="flex items-center justify-end gap-[8px]">
                        {renderPrimaryAction(
                          emp,
                          "h-[32px] px-[13px] bg-white border border-[rgba(0,0,0,0.1)] rounded-[8px] text-[14px] font-medium tracking-[-0.15px] text-[#0a0a0a] hover:bg-gray-50 transition-colors disabled:opacity-50"
                        )}
                        <button onClick={() => openActions(emp)} className="hover:opacity-70 transition-opacity" aria-label="More actions">
                          <img src="/retailer-admin/ellipsis.svg" alt="" width={24} height={24} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredEmployees.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-6 py-10 text-center text-[#62748e] text-[14px]">
                    No employees found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Employee List - Mobile Cards */}
      <div className="flex flex-col gap-4 block md:hidden">
        {filteredEmployees.map((emp) => {
          const chip = chipFor(emp);
          return (
            <div key={emp.id} className="bg-white rounded-[16px] border border-gray-100 p-4 shadow-[0_2px_10px_rgba(0,0,0,0.03)] flex flex-col gap-4">
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-[15px] font-bold text-[#4B5563] shrink-0 border border-black/5"
                    style={{ backgroundColor: getPastelColor(emp.full_name) }}
                  >
                    {emp.full_name?.charAt(0)?.toUpperCase() || "?"}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[14px] font-bold text-[#111827] truncate leading-tight">{emp.full_name}</span>
                    <span className="text-[12px] text-[#6B7280] leading-tight mt-0.5 truncate">{emp.designation || "Staff"}</span>
                  </div>
                </div>
                <div className={`inline-flex items-center px-2.5 py-1 rounded-[6px] text-[12px] font-semibold shrink-0 ${chip.className}`}>
                  {chip.label}
                </div>
              </div>

              {/* Details Box */}
              <div className="flex flex-col gap-2.5 text-[13px] text-[#374151] bg-[#FCFCFC] rounded-[10px] p-3 border border-[#F5F5F5]">
                <div className="flex justify-between items-center gap-2">
                  <span className="text-[#6B7280] font-medium shrink-0">Login:</span>
                  <span className="font-semibold truncate text-[#111827]">{emp.email}</span>
                </div>
                <div className="flex justify-between items-center gap-2">
                  <span className="text-[#6B7280] font-medium shrink-0">Signs in:</span>
                  <span className="text-[#6B7280]">{emp.join_method === "google" ? "with Google" : "with a password"}</span>
                </div>
                {emp.phone && (
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-[#6B7280] font-medium shrink-0">Phone:</span>
                    <span className="font-semibold text-[#6366F1]">{emp.phone}</span>
                  </div>
                )}
                <div className="flex justify-between items-center gap-2">
                  <span className="text-[#6B7280] font-medium shrink-0">Last Active:</span>
                  <span className="text-[#6B7280]">{emp.last_active_at || "---"}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-50">
                {renderPrimaryAction(
                  emp,
                  "h-11 px-4 border border-gray-200 rounded-[10px] text-[13px] font-bold text-[#4B5563] hover:border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-50 flex items-center justify-center"
                )}
                <button
                  onClick={() => openActions(emp)}
                  className="w-11 h-11 border border-gray-200 rounded-[10px] flex items-center justify-center text-[#9CA3AF] hover:text-[#111827] hover:border-gray-300 transition-colors"
                  aria-label="More actions"
                >
                  {moreIcon}
                </button>
              </div>
            </div>
          );
        })}
        {filteredEmployees.length === 0 && (
          <div className="bg-white rounded-[16px] border border-dashed border-gray-200 p-8 text-center text-[#9CA3AF] text-[14px]">
            No employees found matching your search.
          </div>
        )}
      </div>

      {/* Actions dialog (Figma: Retailer admin page → Employees → Actions) */}
      {actionsEmployee && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white w-full max-w-[512px] rounded-[10px] border border-[rgba(0,0,0,0.1)] shadow-[0_10px_15px_rgba(0,0,0,0.1),0_4px_6px_rgba(0,0,0,0.1)] relative flex flex-col p-[24px] max-h-[90vh] overflow-y-auto overscroll-contain">
            <button onClick={closeActions} className="absolute top-[16px] right-[16px] w-[16px] h-[16px] opacity-70 hover:opacity-100 transition-opacity" aria-label="Close">
              <span className="absolute inset-1/4"><img src="/retailer-admin/close-a.svg" alt="" className="absolute inset-[-8.33%] max-w-none" /></span>
              <span className="absolute inset-1/4"><img src="/retailer-admin/close-b.svg" alt="" className="absolute inset-[-8.33%] max-w-none" /></span>
            </button>

            <h2 className="text-[18px] leading-[18px] font-bold tracking-[-0.44px] text-[#0a0a0a]">Actions</h2>
            <p className="text-[14px] text-[#717182] mt-[8px]">
              {actionsEmployee.full_name}
              {isOwnerRow ? " · Store owner" : actionsEmployee.join_method === "google" ? (isInvitedRow ? " · Invited, signs in with Google" : " · Signs in with Google") : ""}
            </p>

            <div className="flex flex-col gap-[16px] mt-[24px]">
              <div className="flex flex-col gap-[8px]">
                <label className="text-[14px] leading-[14px] font-medium tracking-[-0.15px] text-[#0a0a0a]">{actionsEmployee.join_method === "google" ? "Google account" : "Email id"}</label>
                <div className="relative">
                  <input type="text" readOnly value={actionsEmployee.email || ""} className="w-full h-[36px] bg-[#f3f3f5] rounded-[8px] pl-[12px] pr-[44px] text-[14px] tracking-[-0.15px] text-[#717182] outline-none" />
                  <button onClick={() => copyToClipboard("login", actionsEmployee.email)} className="absolute right-[12px] top-1/2 -translate-y-1/2 hover:opacity-70" title="Copy">
                    <img src="/retailer-admin/copy-muted.svg" alt="Copy" width={24} height={24} />
                  </button>
                </div>
                {copied === "login" && <span className="text-[12px] font-semibold text-[#15803d]">Copied</span>}
              </div>

              {/* Password: nothing is stored to show, so it can only be reset */}
              {canResetPassword && (
                <div className="flex flex-col gap-[8px]">
                  <label className="text-[14px] leading-[14px] font-medium tracking-[-0.15px] text-[#0a0a0a]">Password</label>
                  {newPassword ? (
                    <>
                      <div className="relative">
                        <input type="text" readOnly value={newPassword} className="w-full h-[36px] bg-[#f3f3f5] rounded-[8px] pl-[12px] pr-[44px] text-[14px] tracking-[-0.15px] text-[#717182] outline-none !text-[#0a0a0a] font-mono" />
                        <button onClick={() => copyToClipboard("password", newPassword)} className="absolute right-[12px] top-1/2 -translate-y-1/2 hover:opacity-70" title="Copy password">
                          <img src="/retailer-admin/copy-muted.svg" alt="Copy" width={24} height={24} />
                        </button>
                      </div>
                      {copied === "password" && <span className="text-[12px] font-semibold text-[#15803d]">Copied</span>}
                      <p className="text-[12px] text-[#92400E] bg-[#FFFBEB] border border-[#FDE68A] rounded-[8px] px-3 py-2 leading-relaxed">
                        Save it now. It&apos;s shown only this once and isn&apos;t stored anywhere.
                      </p>
                    </>
                  ) : (
                    <div className="flex items-center justify-between gap-3 h-[36px] bg-[#f3f3f5] rounded-[8px] pl-[12px] pr-[4px]">
                      <span className="text-[14px] tracking-[-0.15px] text-[#717182]">*****************</span>
                      <button
                        onClick={handleResetPassword}
                        disabled={isResetting}
                        className="h-[28px] px-[10px] bg-white border border-[rgba(0,0,0,0.1)] rounded-[6px] text-[13px] font-medium text-[#0a0a0a] hover:bg-gray-50 disabled:opacity-60 whitespace-nowrap"
                      >
                        {isResetting ? "Resetting..." : "Reset password"}
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div className="flex flex-col gap-[8px]">
                <label className="text-[14px] leading-[14px] font-medium tracking-[-0.15px] text-[#0a0a0a]">Designation</label>
                <div className="relative w-fit">
                  <input
                    type="text"
                    value={editDesignation}
                    onChange={(e) => setEditDesignation(e.target.value)}
                    className="h-[36px] bg-[#f3f3f5] rounded-[8px] pl-[12px] pr-[44px] text-[14px] tracking-[-0.15px] text-[#717182] outline-none focus:ring-2 focus:ring-black/10 min-w-[123px] max-w-full"
                  />
                  <img src="/retailer-admin/square-pen.svg" alt="" width={24} height={24} className="absolute right-[10px] top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {actionError && (
                <p className="text-[13px] font-medium text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{actionError}</p>
              )}

              <div className="bg-[#eff6ff] border border-[#bedbff] rounded-[10px] px-[13px] py-[13px] mt-[10px]">
                <p className="text-[14px] leading-[20px] tracking-[-0.15px] text-[#193cb8]">
                  <span className="font-bold">Login credentials:</span>{" "}
                  {actionsEmployee.join_method === "google"
                    ? "This person signs in with their Google account; there is no password to manage."
                    : "Passwords are never stored. If one is forgotten, reset it here and share the new one once."}
                </p>
              </div>

              {showDeleteConfirm ? (
                <div className="flex flex-col gap-3 pt-2">
                  <span className="text-[14px] font-bold text-[#b91c1c]">
                    {isInvitedRow
                      ? "Cancel this invitation? They won't be able to join with this address until you invite them again."
                      : "Remove this employee? Their login stops working immediately."}
                  </span>
                  <div className="flex items-center justify-end gap-[8px]">
                    <button onClick={() => setShowDeleteConfirm(false)} className="h-[36px] px-[17px] bg-white border border-[rgba(0,0,0,0.1)] rounded-[8px] text-[14px] font-medium text-[#0a0a0a] hover:bg-gray-50">
                      Keep
                    </button>
                    <button
                      onClick={() => handleDelete(actionsEmployee.id)}
                      disabled={deletingId === actionsEmployee.id}
                      className="h-[36px] px-[17px] bg-[#DC2626] text-white text-[14px] font-medium rounded-[8px] hover:bg-red-700 disabled:opacity-70"
                    >
                      {deletingId === actionsEmployee.id
                        ? (isInvitedRow ? "Cancelling..." : "Removing...")
                        : (isInvitedRow ? "Cancel invitation" : "Remove")}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-end gap-[8px] pt-[5px]">
                  {/* The owner's own row is never removed */}
                  {!isOwnerRow && (
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="h-[36px] flex items-center gap-[8px] pl-[8px] pr-[12px] bg-[#fee2e2] rounded-[8px] text-[14px] font-medium tracking-[0.28px] text-[#b91c1c] hover:bg-red-200 transition-colors"
                    >
                      <img src="/retailer-admin/trash.svg" alt="" width={16} height={16} />
                      {isInvitedRow ? "CANCEL INVITATION" : "DELETE ACCOUNT"}
                    </button>
                  )}
                  {editDesignation !== actionsEmployee.designation ? (
                    <button
                      onClick={handleApplyDesignation}
                      disabled={isUpdatingDesignation}
                      className="h-[36px] px-[17px] bg-black text-white text-[14px] font-medium rounded-[8px] hover:bg-gray-800 disabled:opacity-70"
                    >
                      {isUpdatingDesignation ? "Applying..." : "Apply"}
                    </button>
                  ) : (
                    <button onClick={closeActions} className="h-[36px] px-[17px] bg-white border border-[rgba(0,0,0,0.1)] rounded-[8px] text-[14px] font-medium tracking-[-0.15px] text-[#0a0a0a] hover:bg-gray-50">
                      Close
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
