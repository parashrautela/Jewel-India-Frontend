"use client";

import { usePathname } from "next/navigation";
import EmployeeBottomNav from "./EmployeeTopNav";

import { ThemeProvider } from "@/context/ThemeContext";
import { EmployeeAppearanceProvider, useEmployeeAppearance } from "@/context/EmployeeAppearanceContext";
import EmployeeModeToggle from "./EmployeeModeToggle";
import "./employeeAppearance.css";

function EmployeeShell({ children, hasUnreadQueries, latestOrderUpdate, isRetailer }) {
  const pathname = usePathname();
  const { sarvamMode } = useEmployeeAppearance();
  const hideNavbar = pathname?.includes("/dashboard/employee/playground") || pathname?.includes("/dashboard/employee/questionnaire");
  return (
      <div className={`theme-employee employee-shell${sarvamMode ? " employee-sarvam" : ""}`} data-employee-mode={sarvamMode ? "sarvam" : "default"} style={{ minHeight: "100vh", background: sarvamMode ? "#FCFCFC" : "#FAFAFA", display: "flex", flexDirection: "column" }}>
      <header className="employee-mode-bar">
        <span className={`employee-mode-caption${isRetailer ? " employee-preview-caption" : ""}`}>
          {isRetailer ? "Employee View Active" : "Employee view"}
        </span>
        <EmployeeModeToggle />
      </header>
      <main
        data-employee-content
        style={{
          flex: 1,
          width: "100%",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {children}
      </main>
      {!hideNavbar && (
        <EmployeeBottomNav hasUnreadQueries={hasUnreadQueries} latestOrderUpdate={latestOrderUpdate} isRetailer={isRetailer} />
      )}
      </div>
  );
}

export default function EmployeeLayout({ children, hasUnreadQueries = false, latestOrderUpdate = null, isRetailer = false, selectedTheme = "indian" }) {
  return (
    <ThemeProvider initialTheme={selectedTheme}>
      <EmployeeAppearanceProvider>
        <EmployeeShell hasUnreadQueries={hasUnreadQueries} latestOrderUpdate={latestOrderUpdate} isRetailer={isRetailer}>
          {children}
        </EmployeeShell>
      </EmployeeAppearanceProvider>
    </ThemeProvider>
  );
}
