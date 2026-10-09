"use client";

import { useEmployeeAppearance } from "@/context/EmployeeAppearanceContext";

export default function EmployeeModeToggle() {
  const { sarvamMode, setSarvamMode } = useEmployeeAppearance();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={sarvamMode}
      aria-label="Sarvam Mode"
      onClick={() => setSarvamMode(!sarvamMode)}
      className="employee-mode-toggle"
      data-enabled={sarvamMode}
    >
      <span className="employee-mode-toggle-track" aria-hidden="true">
        <span className="employee-mode-toggle-thumb" />
      </span>
      <span>Sarvam Mode {sarvamMode ? "On" : "Off"}</span>
    </button>
  );
}
