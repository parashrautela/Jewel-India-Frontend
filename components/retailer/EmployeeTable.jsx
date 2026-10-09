"use client";

import { useState, useMemo, useDeferredValue } from "react";
import Image from "next/image";

const COPY_ICON = "https://res.cloudinary.com/dcs0vuzwg/image/upload/v1777306236/retailerProfile_COPY_szewo3.svg";
const TRASH_ICON = "https://res.cloudinary.com/dcs0vuzwg/image/upload/v1777306235/retailerProfile_TRASH_v21ak2.svg";

const STATUS_CHIPS = {
  active: { label: "Active", className: "bg-[#DCFCE7] text-[#166534]" },
  invited: { label: "Invited", className: "bg-[#DBEAFE] text-[#1D4ED8]" },
  inactive: { label: "Off", className: "bg-[#FEF3C7] text-[#B45309]" },
};

const chipFor = (emp) => STATUS_CHIPS[emp.status] || STATUS_CHIPS.inactive;

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
        {emp.status === "active" ? "Deactivate" : "Reactivate"}
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
      <div className="relative w-full shadow-[0_2px_10px_rgba(0,0,0,0.03)] rounded-[12px]">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-[18px] h-[18px] text-[#9CA3AF]">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          type="text"
          placeholder="Search employees by name or email..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="w-full bg-white border border-gray-100 rounded-[12px] pl-11 pr-4 h-[52px] text-[14px] outline-none focus:ring-2 focus:ring-black/5 text-[#111827] placeholder-[#9CA3AF]"
        />
      </div>

      {/* Employee Table - Desktop/Tablet */}
      <div className="bg-white border border-gray-100 rounded-[16px] shadow-[0_2px_10px_rgba(0,0,0,0.03)] overflow-hidden hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left border-collapse">
            <thead>
              <tr>
                <th className="px-6 py-4 text-[13px] font-bold text-[#6B7280]">Employee</th>
                <th className="px-6 py-4 text-[13px] font-bold text-[#6B7280]">Login</th>
                <th className="px-6 py-4 text-[13px] font-bold text-[#6B7280]">Role</th>
                <th className="px-6 py-4 text-[13px] font-bold text-[#6B7280]">Status</th>
                <th className="px-6 py-4 text-[13px] font-bold text-[#6B7280]">Last Active</th>
                <th className="px-6 py-4 text-[13px] font-bold text-[#6B7280] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredEmployees.map((emp) => {
                const chip = chipFor(emp);
                return (
                  <tr key={emp.id} className="hover:bg-gray-50/30 transition-colors">
                    {/* Employee */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-[40px] h-[40px] rounded-full flex items-center justify-center text-[15px] font-bold text-[#4B5563] shrink-0 border border-black/5"
                          style={{ backgroundColor: getPastelColor(emp.full_name) }}
                        >
                          {emp.full_name?.charAt(0)?.toUpperCase() || "?"}
                        </div>
                        <span className="text-[14px] font-bold text-[#111827]">{emp.full_name}</span>
                      </div>
                    </td>

                    {/* Login */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="text-[13px] font-medium text-[#111827]">{emp.email}</span>
                        <span className="text-[12px] text-[#9CA3AF]">
                          {emp.join_method === "google" ? "Signs in with Google" : "Signs in with a password"}
                          {emp.phone ? ` · ${emp.phone}` : ""}
                        </span>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-[13px] text-[#6B7280]">{emp.designation}</span>
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`inline-flex items-center px-2.5 py-1 rounded-[6px] text-[12px] font-semibold ${chip.className}`}>
                        {chip.label}
                      </div>
                    </td>

                    {/* Last Active */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-[13px] text-[#9CA3AF]">
                        {emp.last_active_at ? emp.last_active_at : "---"}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-3">
                        {renderPrimaryAction(
                          emp,
                          "px-3 py-1.5 border border-gray-200 rounded-[8px] text-[13px] font-medium text-[#4B5563] hover:border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-50"
                        )}
                        <button
                          onClick={() => openActions(emp)}
                          className="p-1 text-[#9CA3AF] hover:text-[#111827] transition-colors"
                        >
                          {moreIcon}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredEmployees.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-6 py-10 text-center text-[#9CA3AF] text-[14px]">
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

      {/* Actions Modal Overlay */}
      {actionsEmployee && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-[480px] rounded-[16px] border border-white shadow-[0_10px_40px_rgba(0,0,0,0.1)] relative flex flex-col p-6 sm:p-8 max-h-[90vh] overflow-y-auto overscroll-contain">

            <button onClick={closeActions} className="absolute top-6 right-6 text-black hover:opacity-70 transition-opacity">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>

            <h2 className="text-[20px] font-extrabold text-[#111827] mb-1">{actionsEmployee.full_name}</h2>
            <p className="text-[13px] text-[#9CA3AF] mb-6">
              {isOwnerRow
                ? "Store owner"
                : actionsEmployee.join_method === "google"
                  ? isInvitedRow ? "Invited — signs in with Google" : "Signs in with Google"
                  : "Signs in with a password"}
            </p>

            <div className="flex flex-col gap-5">
              {/* Login */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[14px] font-bold text-[#111827]">
                  {actionsEmployee.join_method === "google" ? "Google account" : "Username"}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    readOnly
                    value={actionsEmployee.email || ""}
                    className="w-full h-[48px] bg-[#F3F4F6] rounded-[10px] pl-[14px] pr-[48px] text-[15px] text-[#6B7280] outline-none"
                  />
                  <button
                    onClick={() => copyToClipboard("login", actionsEmployee.email)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 hover:bg-gray-200 rounded-md transition-colors"
                    title="Copy"
                  >
                    <Image src={COPY_ICON} alt="Copy" width={20} height={20} loading="lazy" className="object-contain" />
                  </button>
                </div>
                {copied === "login" && <span className="text-[12px] font-semibold text-[#166534]">Copied</span>}
              </div>

              {/* Password — reset only; nothing is stored to show */}
              {canResetPassword && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-[14px] font-bold text-[#111827]">Password</label>
                  {newPassword ? (
                    <>
                      <div className="relative">
                        <input
                          type="text"
                          readOnly
                          value={newPassword}
                          className="w-full h-[48px] bg-[#F3F4F6] rounded-[10px] pl-[14px] pr-[48px] text-[15px] text-[#111827] outline-none font-mono"
                        />
                        <button
                          onClick={() => copyToClipboard("password", newPassword)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 hover:bg-gray-200 rounded-md transition-colors"
                          title="Copy Password"
                        >
                          <Image src={COPY_ICON} alt="Copy" width={18} height={18} loading="lazy" className="object-contain" />
                        </button>
                      </div>
                      {copied === "password" && <span className="text-[12px] font-semibold text-[#166534]">Copied</span>}
                      <p className="text-[12px] text-[#92400E] bg-[#FFFBEB] border border-[#FDE68A] rounded-[8px] px-3 py-2 leading-relaxed">
                        Save it now. It&apos;s shown only this once and isn&apos;t stored anywhere.
                      </p>
                    </>
                  ) : (
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[13px] text-[#6B7280]">Forgotten? Give them a new one.</span>
                      <button
                        onClick={handleResetPassword}
                        disabled={isResetting}
                        className="h-[40px] px-4 border border-gray-300 rounded-[10px] text-[13px] font-bold text-[#111827] hover:bg-gray-50 transition-colors disabled:opacity-60 whitespace-nowrap"
                      >
                        {isResetting ? "Resetting..." : "Reset password"}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Designation */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[14px] font-bold text-[#111827]">Designation</label>
                <div className="relative w-fit">
                  <input
                    type="text"
                    value={editDesignation}
                    onChange={(e) => setEditDesignation(e.target.value)}
                    className="h-[40px] bg-[#F3F4F6] rounded-[10px] pl-[14px] pr-[44px] text-[14px] text-[#4B5563] outline-none focus:ring-2 focus:ring-black/10 min-w-[140px] max-w-full cursor-pointer"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                  </div>
                </div>
              </div>

              {actionError && (
                <p className="text-[13px] font-medium text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{actionError}</p>
              )}

              {/* Info Box */}
              <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-[10px] p-4 mt-2">
                <p className="text-[13px] text-[#1D4ED8] leading-relaxed">
                  <span className="font-bold">Login credentials:</span>{" "}
                  {actionsEmployee.join_method === "google"
                    ? "This person signs in with their Google account; there is no password to manage."
                    : "Passwords are never stored. If one is forgotten, reset it here and share the new one once."}
                </p>
              </div>

              {/* Bottom Buttons */}
              {showDeleteConfirm ? (
                <div className="flex flex-col gap-3 mt-4 pt-4 border-t border-gray-100">
                  <span className="text-[14px] font-bold text-red-600">
                    {isInvitedRow
                      ? "Cancel this invitation? They won't be able to join with this address until you invite them again."
                      : "Remove this employee? Their login stops working immediately."}
                  </span>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className="flex-1 h-[44px] px-6 bg-white border border-gray-300 text-[#111827] font-medium text-[14px] rounded-[10px] hover:bg-gray-50 transition-colors"
                    >
                      Keep
                    </button>
                    <button
                      onClick={() => handleDelete(actionsEmployee.id)}
                      disabled={deletingId === actionsEmployee.id}
                      className="flex-1 h-[44px] px-6 bg-[#DC2626] text-white font-medium text-[14px] rounded-[10px] hover:bg-red-700 transition-colors disabled:opacity-70 flex items-center justify-center"
                    >
                      {deletingId === actionsEmployee.id
                        ? (isInvitedRow ? "Cancelling..." : "Removing...")
                        : (isInvitedRow ? "Cancel invitation" : "Remove")}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between mt-4 pt-2">
                  <div className="flex gap-2">
                    <button
                      onClick={closeActions}
                      className="h-[44px] px-6 bg-white border border-gray-300 text-[#111827] font-medium text-[14px] rounded-[10px] hover:bg-gray-50 transition-colors"
                    >
                      Close
                    </button>
                    {/* The owner's own row is never removed */}
                    {!isOwnerRow && (
                      <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="flex items-center justify-center w-[44px] h-[44px] bg-[#FEE2E2] text-[#B91C1C] rounded-[10px] hover:bg-red-200 transition-colors"
                        title={isInvitedRow ? "Cancel invitation" : "Remove employee"}
                      >
                        <Image src={TRASH_ICON} alt="Trash" width={18} height={18} loading="lazy" />
                      </button>
                    )}
                  </div>

                  {editDesignation !== actionsEmployee.designation && (
                    <button
                      onClick={handleApplyDesignation}
                      disabled={isUpdatingDesignation}
                      className="h-[44px] px-6 bg-black text-white font-medium text-[14px] rounded-[10px] hover:bg-gray-800 transition-colors disabled:opacity-70"
                    >
                      {isUpdatingDesignation ? "Applying..." : "Apply"}
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
