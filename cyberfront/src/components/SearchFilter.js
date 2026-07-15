import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Sidebar() {
  const { user } = useAuth();

  return (
    <div className="sidebar">
      <h2>CyberSOC</h2>

      <p>Role: {user?.role}</p>

      <Link to="/">Dashboard</Link>
      <Link to="/incidents">Incidents</Link>
      <Link to="/alerts">Alerts</Link>
      <Link to="/reports">Reports</Link>
    </div>
  );
}