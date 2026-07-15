import React from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  FaHome,
  FaShieldAlt,
  FaCheckCircle,
  FaUsers,
  FaBell,
  FaFileAlt,
  FaClipboardList,
  FaChartBar,
  FaListAlt,
  FaCog,
  FaPlusCircle,
  FaHistory
} from "react-icons/fa";

function Sidebar() {
  const { user } = useAuth();
  const role = user?.role?.toUpperCase();

  return (
    <div className="soc-sidebar">
      {/* Profile Card Header */}
      {user && (
        <div className="sidebar-profile-card text-center p-3 mb-3 border-bottom" style={{ borderColor: "rgba(255,255,255,0.15)" }}>
          <div className="mb-2">
            {user.profileImage ? (
              <img
                src={`http://localhost:8080${user.profileImage}`}
                alt="Profile"
                className="rounded-circle border border-2 border-light"
                style={{ width: "60px", height: "60px", objectFit: "cover" }}
              />
            ) : (
              <div 
                className="rounded-circle bg-secondary d-flex align-items-center justify-content-center mx-auto text-white fw-bold border border-2 border-light"
                style={{ width: "60px", height: "60px", fontSize: "22px" }}
              >
                {(user.fullName || user.username || "?").charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <h5 className="text-white fw-bold mb-1" style={{ fontSize: "14px" }}>
            {user.fullName || user.username}
          </h5>
          <div className="badge bg-primary mb-1 text-uppercase" style={{ fontSize: "9px", padding: "3px 8px" }}>
            {role}
          </div>
          {user.department && (
            <div className="text-white-50 mt-0.5" style={{ fontSize: "11px", fontWeight: "500" }}>
              {user.department}
            </div>
          )}
        </div>
      )}

      <div className="sidebar-heading">Navigation</div>
      
      {/* Dashboard is visible to all roles */}
      <NavLink to="/dashboard" className={({ isActive }) => isActive ? "active-link" : ""}>
        <FaHome /> <span>Dashboard</span>
      </NavLink>

      <NavLink to="/activity" className={({ isActive }) => isActive ? "active-link" : ""}>
        <FaHistory /> <span>System Activity</span>
      </NavLink>

      {/* EMPLOYEE MENU */}
      {role === "EMPLOYEE" && (
        <>
          <NavLink to="/report" className={({ isActive }) => isActive ? "active-link" : ""}>
            <FaPlusCircle /> <span>Report Incident</span>
          </NavLink>
          <NavLink to="/incidents" className={({ isActive }) => isActive ? "active-link" : ""}>
            <FaShieldAlt /> <span>Active Incidents</span>
          </NavLink>
        </>
      )}

      {/* ANALYST MENU */}
      {role === "ANALYST" && (
        <>
          <NavLink to="/my-incidents" className={({ isActive }) => isActive ? "active-link" : ""}>
            <FaShieldAlt /> <span>My Incidents</span>
          </NavLink>
        </>
      )}

      {/* ADMIN MENU */}
      {role === "ADMIN" && (
        <>
          <NavLink to="/report" className={({ isActive }) => isActive ? "active-link" : ""}>
            <FaPlusCircle /> <span>Create Incident</span>
          </NavLink>
          
          <NavLink to="/incidents" className={({ isActive }) => isActive ? "active-link" : ""}>
            <FaShieldAlt /> <span>Active Incidents</span>
          </NavLink>

          <NavLink to="/approval-queue" className={({ isActive }) => isActive ? "active-link" : ""}>
            <FaClipboardList /> <span>Approval Queue</span>
          </NavLink>

          <NavLink to="/users" className={({ isActive }) => isActive ? "active-link" : ""}>
            <FaUsers /> <span>User Management</span>
          </NavLink>

          <NavLink to="/employees" className={({ isActive }) => isActive ? "active-link" : ""}>
            <FaUsers /> <span>Employee Directory</span>
          </NavLink>
        </>
      )}

      {/* Analyst, Admin, and Employee Shared Pages */}
      {(role === "ADMIN" || role === "ANALYST" || role === "EMPLOYEE") && (
        <>
          <div className="sidebar-heading">SOC Tools</div>

          {(role === "ADMIN" || role === "ANALYST") && (
            <NavLink to="/alerts" className={({ isActive }) => isActive ? "active-link" : ""}>
              <FaBell /> <span>Security Alerts</span>
            </NavLink>
          )}

          <NavLink to="/resolved-incidents" className={({ isActive }) => isActive ? "active-link" : ""}>
            <FaCheckCircle /> <span>Resolved Archive</span>
          </NavLink>

          {(role === "ADMIN" || role === "ANALYST") && (
            <NavLink to="/reports" className={({ isActive }) => isActive ? "active-link" : ""}>
              <FaFileAlt /> <span>Analytics & Reports</span>
            </NavLink>
          )}
        </>
      )}

      {/* Admin Specific Operations */}
      {role === "ADMIN" && (
        <>
          <div className="sidebar-heading">Monitoring</div>

          <NavLink to="/analyst-performance" className={({ isActive }) => isActive ? "active-link" : ""}>
            <FaChartBar /> <span>Analyst Workload</span>
          </NavLink>

          <NavLink to="/audit" className={({ isActive }) => isActive ? "active-link" : ""}>
            <FaListAlt /> <span>Audit logs</span>
          </NavLink>
        </>
      )}

      <div className="sidebar-heading">Account</div>
      <NavLink to="/notifications" className={({ isActive }) => isActive ? "active-link" : ""}>
        <FaBell /> <span>Notifications Center</span>
      </NavLink>
      <NavLink to="/settings" className={({ isActive }) => isActive ? "active-link" : ""}>
        <FaCog /> <span>Settings</span>
      </NavLink>
    </div>
  );
}

export default Sidebar;