import React from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import NotificationBell from "./NotificationBell";
import { FaSignOutAlt, FaUserCircle, FaShieldAlt } from "react-icons/fa";

function Navbar() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const role = user?.role?.toUpperCase();

  const handleLogout = () => {
    logout();
    localStorage.removeItem("currentUser");
    localStorage.removeItem("token");
    navigate("/login");
  };

  const imageUrl = user?.profileImage ? `${window.API_BASE_URL}${user.profileImage}` : null;

  return (
    <div className="soc-navbar">
      <Link to="/dashboard" className="soc-brand">
        <FaShieldAlt style={{ color: "#0d6efd" }} />
        <span>CyberSOC</span>
      </Link>

      <div className="navbar-right">
        {/* Real-time Notifications Bell */}
        <NotificationBell />

        {/* User profile capsule */}
        <Link to="/profile" className="text-decoration-none d-flex align-items-center gap-2 bg-light px-3 py-1.5 rounded-pill border">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt="Profile"
              className="rounded-circle border"
              style={{ width: "24px", height: "24px", objectFit: "cover" }}
            />
          ) : (
            <FaUserCircle style={{ fontSize: "18px", color: "#64748b" }} />
          )}
          <div className="d-flex flex-column text-start" style={{ lineHeight: "1.2" }}>
            <span className="fw-semibold text-dark" style={{ fontSize: "13px" }}>
              {user?.fullName || user?.username || "Guest User"}
            </span>
            <span className={`badge-status text-center ${
              role === "ADMIN" ? "bg-danger-subtle text-danger" :
              role === "ANALYST" ? "bg-warning-subtle text-warning" : "bg-success-subtle text-success"
            }`} style={{ fontSize: "9px", padding: "1px 5px", display: "inline-block", borderRadius: "10px" }}>
              {role || "EMPLOYEE"}
            </span>
          </div>
        </Link>

        {/* Logout Button */}
        <button 
          onClick={handleLogout}
          className="btn btn-outline-danger btn-sm rounded-pill d-flex align-items-center gap-1.5 px-3 py-1.5 fw-semibold"
          style={{ fontSize: "13px" }}
        >
          <FaSignOutAlt />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
}

export default Navbar;