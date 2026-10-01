import { useState, useEffect } from "react";
import { AuthContext } from "./authContext";

const ROLE_STORAGE_KEY = "office_barista_role";
const EMPLOYEE_NAME_KEY = "office_barista_employee_name";
const DEFAULT_ADMIN_PASSCODE =
  import.meta.env.VITE_ADMIN_PASSWORD || "admin123";

export function AuthProvider({ children }) {
  const [role, setRole] = useState(() => {
    try {
      const savedRole = localStorage.getItem(ROLE_STORAGE_KEY);
      if (savedRole === "admin" || savedRole === "caretaker") {
        return "admin";
      }
      if (savedRole === "employee") {
        return "employee";
      }
      // If employee name exists from previous session, automatically resume employee role
      const savedName = localStorage.getItem(EMPLOYEE_NAME_KEY);
      if (savedName && savedName.trim()) {
        return "employee";
      }
      return null;
    } catch {
      return null;
    }
  });

  const [employeeName, setEmployeeName] = useState(() => {
    try {
      return localStorage.getItem(EMPLOYEE_NAME_KEY) || "";
    } catch {
      return "";
    }
  });

  // Keep localStorage synced when role or employeeName changes
  useEffect(() => {
    try {
      if (role) {
        localStorage.setItem(ROLE_STORAGE_KEY, role);
      } else {
        localStorage.removeItem(ROLE_STORAGE_KEY);
      }
    } catch (e) {
      console.warn("Failed to persist auth role:", e);
    }
  }, [role]);

  useEffect(() => {
    try {
      if (employeeName && employeeName.trim()) {
        localStorage.setItem(EMPLOYEE_NAME_KEY, employeeName.trim());
      }
    } catch (e) {
      console.warn("Failed to persist employee name:", e);
    }
  }, [employeeName]);

  // Caretaker authentication
  const loginCaretaker = (passcode) => {
    if (!passcode) {
      return { success: false, error: "Please enter the caretaker passcode." };
    }

    if (passcode.trim() === DEFAULT_ADMIN_PASSCODE) {
      setRole("admin");
      try {
        localStorage.setItem(ROLE_STORAGE_KEY, "admin");
      } catch (e) {
        console.warn(e);
      }
      return { success: true };
    }

    return {
      success: false,
      error: "Incorrect passcode. Default is 'admin123'.",
    };
  };

  // Employee authentication
  const loginEmployee = (name) => {
    const trimmed = (name || "").trim();
    if (!trimmed) {
      return { success: false, error: "Please enter your name to continue." };
    }

    setEmployeeName(trimmed);
    setRole("employee");
    try {
      localStorage.setItem(ROLE_STORAGE_KEY, "employee");
      localStorage.setItem(EMPLOYEE_NAME_KEY, trimmed);
    } catch (e) {
      console.warn(e);
    }
    return { success: true };
  };

  const updateEmployeeName = (newName) => {
    const trimmed = (newName || "").trim();
    if (!trimmed) return;
    setEmployeeName(trimmed);
    try {
      localStorage.setItem(EMPLOYEE_NAME_KEY, trimmed);
    } catch (e) {
      console.warn(e);
    }
  };

  // Logout current session
  const logout = () => {
    setRole(null);
    try {
      localStorage.removeItem(ROLE_STORAGE_KEY);
    } catch (e) {
      console.warn(e);
    }
  };

  // Completely forget employee identity
  const clearEmployeeSession = () => {
    setRole(null);
    setEmployeeName("");
    try {
      localStorage.removeItem(ROLE_STORAGE_KEY);
      localStorage.removeItem(EMPLOYEE_NAME_KEY);
    } catch (e) {
      console.warn(e);
    }
  };

  const isCaretaker = role === "admin" || role === "caretaker";
  const isEmployee = role === "employee" && Boolean(employeeName);

  const value = {
    role,
    isAdmin: isCaretaker, // backward compatible
    isCaretaker,
    isEmployee,
    employeeName,
    login: loginCaretaker, // backward compatible
    loginCaretaker,
    loginEmployee,
    updateEmployeeName,
    logout,
    clearEmployeeSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
