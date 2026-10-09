"use client";

import { createContext, useContext, useSyncExternalStore } from "react";

export const EMPLOYEE_APPEARANCE_KEY = "jewel_employee_appearance";
const CHANGE_EVENT = "jewel:employee-appearance";
let memoryPreference = false;
let storageUnavailable = false;

function getSnapshot() {
  if (storageUnavailable) return memoryPreference;
  try {
    return window.localStorage.getItem(EMPLOYEE_APPEARANCE_KEY) === "sarvam";
  } catch {
    return memoryPreference;
  }
}

function subscribe(onChange) {
  const handleStorage = (event) => {
    if (event.key === EMPLOYEE_APPEARANCE_KEY || event.key === null) {
      storageUnavailable = false;
      onChange();
    }
  };
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", handleStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", handleStorage);
  };
}

function setSarvamMode(enabled) {
  memoryPreference = enabled;
  try {
    window.localStorage.setItem(EMPLOYEE_APPEARANCE_KEY, enabled ? "sarvam" : "default");
    storageUnavailable = false;
  } catch {
    storageUnavailable = true;
    // The toggle still works when the browser blocks persistent storage.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

const EmployeeAppearanceContext = createContext({ sarvamMode: false, setSarvamMode });

export function EmployeeAppearanceProvider({ children }) {
  // The server and first hydration render always use the original appearance.
  const sarvamMode = useSyncExternalStore(subscribe, getSnapshot, () => false);
  return (
    <EmployeeAppearanceContext.Provider value={{ sarvamMode, setSarvamMode }}>
      {children}
    </EmployeeAppearanceContext.Provider>
  );
}

export function useEmployeeAppearance() {
  return useContext(EmployeeAppearanceContext);
}
