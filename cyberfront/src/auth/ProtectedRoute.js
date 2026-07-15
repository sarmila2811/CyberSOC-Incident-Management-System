import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function ProtectedRoute({ children }) {

  const { user } = useAuth();
  const location = useLocation();

  // ✔ fallback (IMPORTANT)
  const storedUser = JSON.parse(localStorage.getItem("currentUser"));
  const currentUser = user || storedUser;

  if (!currentUser) {
    return <Navigate to="/login" />;
  }

  if (currentUser?.forcePasswordChange && location.pathname !== "/change-password") {
    return <Navigate to="/change-password" />;
  }

  const role = currentUser?.role?.toUpperCase();

  // ADMIN ONLY PAGES
  if (
    role !== "ADMIN" &&
    (
      location.pathname === "/users" ||
      location.pathname === "/audit"
    )
  ) {
    return <Navigate to="/dashboard" />;
  }

  return children;
}


export default ProtectedRoute;