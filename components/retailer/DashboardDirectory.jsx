"use client";

import { useState } from "react";

export default function DashboardDirectory({ initialEmployees }) {
  const [employees, setEmployees] = useState(initialEmployees);
  const [togglingId, setTogglingId] = useState(null);

  const handleToggleStatus = async (id, currentStatus) => {
    const isNowActive = currentStatus !== "active";
    setTogglingId(id);
    
    try {
      const res = await fetch(`/api/employees/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: isNowActive ? "active" : "inactive"
        }),
      });

      if (!res.ok) throw new Error("Failed to update status");
      
      const { data: updatedEmp } = await res.json();
      
      setEmployees(prev => {
        const next = prev.map(emp => 
          emp.id === id ? { ...emp, status: updatedEmp.status } : emp
        );
        return [...next];
      });
    } catch (err) {
      alert(err.message);
    } finally {
      setTogglingId(null);
    }
  };

  if (!employees || employees.length === 0) {
    return (
      <div className="py-12 text-center text-[#62748e] text-[15px]">
        No employees found. Add one to get started.
      </div>
    );
  }

  return (
    <div className="divide-y divide-[#e5e5e5] border-t border-[#e5e5e5]">
      {employees.map((emp, i) => {
        const hoursActive = Math.max(1, Math.floor((new Date() - new Date(emp.created_at)) / (1000 * 60 * 60)));
        const isActive = emp.status === "active";
        const initials = emp.full_name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

        return (
          <div key={emp.id} className="flex items-center justify-between px-[12px] py-[12px] min-h-[76px]">
            <div className="flex items-center gap-[12px]">
              <div
                className="w-[40px] h-[40px] rounded-full flex items-center justify-center shrink-0 text-[16px] font-medium text-white [text-shadow:0_1px_4px_rgba(0,0,0,0.63)]"
                style={AVATARS[i % AVATARS.length]}
              >
                {initials}
              </div>
              <div className="flex flex-col">
                <span className="text-[16px] font-medium tracking-[-0.31px] text-[#0f172b] leading-[24px]">{emp.full_name}</span>
                <span className="text-[14px] tracking-[-0.15px] text-[#62748e] leading-[20px]">{emp.designation || "Staff"}</span>
              </div>
            </div>

            <div className={`px-[12px] py-[6px] text-[14px] font-medium tracking-[0.28px] leading-[20px] rounded-[8px] whitespace-nowrap ${
              isActive ? "bg-[#dcfce7] text-[#15803d]" : "bg-[#fee2e2] text-[#b91c1c]"
            }`}>
              {isActive ? `Active from ${hoursActive} hours` : "Inactive"}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Soft radial avatar backgrounds from the Figma directory rows.
const AVATARS = [
  { border: "0.2px solid #60a5e8", background: "radial-gradient(circle, #ffffff 0%, #f1f4c6 85%, #ffffff 100%)" },
  { border: "0.2px solid #d0d0d0", background: "radial-gradient(circle, #fea7fe 0%, #fed3fe 35%, #ffffff 70%)" },
  { border: "0.2px solid #cacaca", background: "radial-gradient(circle, #cdfedd 0%, #ffffff 60%)" },
];
