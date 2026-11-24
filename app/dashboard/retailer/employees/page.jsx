"use client";

import { useState, useEffect, useRef } from "react";
import { EmployeeTable } from "../../../../components/retailer/EmployeeTable";

// Module-level cache that persists across navigation (survives component unmount)
const employeesCache = {
  data: [],
  timestamp: 0
};
const CACHE_TTL_MS = 30_000;

export default function RetailerEmployeesPage() {
  const [employees, setEmployees] = useState(() => employeesCache.data || []);
  const [isLoading, setIsLoading] = useState(employeesCache.data.length === 0);
  const [error, setError] = useState(null);

  const abortRef = useRef(null);

  const fetchEmployees = async (force = false) => {
    // Cancel any in-flight request before starting a new one
    if (abortRef.current) {
      abortRef.current.abort();
    }
    const controller = new AbortController();
    abortRef.current = controller;

    // Skip if recent cached data is already available.
    if (!force && employeesCache.data.length > 0 && Date.now() - employeesCache.timestamp < CACHE_TTL_MS) {
      setEmployees(employeesCache.data);
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/employees/list", {
        signal: controller.signal,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load employees");

      // Update both state and module-level cache
      employeesCache.data = data.data || [];
      employeesCache.timestamp = Date.now();
      setEmployees(employeesCache.data);
    } catch (err) {
      if (err.name === "AbortError") return; // Ignore cancelled requests
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
    // The add-employee modal announces a new login or invitation.
    const onChanged = () => fetchEmployees(true);
    window.addEventListener("employees:changed", onChanged);
    return () => window.removeEventListener("employees:changed", onChanged);
  }, []);

  const handleToggleStatus = async (id, isActive) => {
    try {
      const res = await fetch(`/api/employees/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: isActive ? "active" : "inactive"
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update status");
      }

      // Update cache in-place without refetch
      employeesCache.data = employeesCache.data.map(e =>
        e.id === id ? { ...e, status: isActive ? "active" : "inactive" } : e
      );
      employeesCache.timestamp = Date.now();
      setEmployees([...employeesCache.data]);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (id) => {
    try {
      const res = await fetch(`/api/employees/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to remove employee");
      }

      employeesCache.data = employeesCache.data.filter(e => e.id !== id);
      employeesCache.timestamp = Date.now();
      setEmployees(employeesCache.data);
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="flex flex-col min-h-screen relative">
      <main className="flex-1 w-full max-w-[908px] px-6 lg:pl-0 lg:pr-9 pt-[27px] pb-10">
        <div className="flex flex-col gap-[4px] mb-[28px]">
          <h1 className="text-[24px] leading-[32px] font-bold text-[#0f172b] tracking-[0.07px]">
            Employees
          </h1>
          <p className="text-[14px] leading-[20px] font-medium text-[#62748e] tracking-[-0.15px]">
            Welcome back! Here&apos;s an overview of your employees
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 border border-red-200 rounded-[10px] text-sm font-medium">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="flex flex-col gap-4 animate-pulse">
            <div className="h-[52px] bg-gray-200 rounded-[12px] w-full"></div>
            <div className="h-[300px] bg-gray-100 rounded-[16px] w-full"></div>
          </div>
        ) : (
          <EmployeeTable
            employees={employees}
            onToggleStatus={handleToggleStatus}
            onDelete={handleDelete}
            onUpdate={() => fetchEmployees(true)} // Force refresh after designation change
          />
        )}
      </main>
    </div>
  );
}
