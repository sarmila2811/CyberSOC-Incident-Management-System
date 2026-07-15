import React, { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import { Link, useNavigate } from "react-router-dom";
import { FaShieldAlt, FaExclamationTriangle, FaSearch, FaArrowRight } from "react-icons/fa";
import { formatIncidentId } from "../utils/format";

function Alerts() {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState([]);
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const res = await fetch("http://localhost:8080/api/incidents", {
        headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
      });
      if (res.ok) {
        const data = await res.json();
        // Filters active security alerts (Critical, High priority or Under Investigation, Escalated status)
        const filtered = (data || []).filter(i => {
          const p = (i.priority || "").toUpperCase();
          const s = (i.status || "").toUpperCase();
          return p === "CRITICAL" || p === "HIGH" || s === "UNDER INVESTIGATION" || s === "ESCALATED";
        });
        setAlerts(filtered);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const filteredAlerts = alerts.filter(a => {
    const q = search.toLowerCase();
    const matchSearch = !search ||
      (a.title || "").toLowerCase().includes(q) ||
      (a.category || "").toLowerCase().includes(q) ||
      String(a.id).includes(q);

    const matchPriority = !priorityFilter || a.priority === priorityFilter;

    return matchSearch && matchPriority;
  });

  const criticalCount = alerts.filter(a => a.priority === "Critical").length;
  const highCount = alerts.filter(a => a.priority === "High").length;
  const escalatedCount = alerts.filter(a => a.status === "Escalated").length;

  return (
    <div className="app-wrapper">
      <Navbar />
      <div className="page-container">
        <Sidebar />
        <div className="main-content">
          <div className="soc-breadcrumb">
            <Link to="/dashboard">Home</Link>
            <span>/</span>
            <span>Security Alerts Terminal</span>
          </div>

          <div className="mb-4">
            <h2 className="m-0 fw-bold">Security Alerts Terminal</h2>
            <p className="text-muted m-0">Real-time indicators of compromise, escalation actions, and critical exposures.</p>
          </div>

          {/* Alarm KPI Grid */}
          <div className="row g-4 mb-4">
            <div className="col-md-4">
              <div className="kpi-card border-danger">
                <div className="kpi-icon-wrapper bg-danger-subtle text-danger">
                  <FaExclamationTriangle />
                </div>
                <div className="kpi-details">
                  <h4>Critical Exposure</h4>
                  <h2>{criticalCount}</h2>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="kpi-card border-warning">
                <div className="kpi-icon-wrapper bg-warning-subtle text-warning">
                  <FaExclamationTriangle />
                </div>
                <div className="kpi-details">
                  <h4>High Risk Alerts</h4>
                  <h2>{highCount}</h2>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="kpi-card border-primary">
                <div className="kpi-icon-wrapper bg-primary-subtle text-primary">
                  <FaShieldAlt />
                </div>
                <div className="kpi-details">
                  <h4>Escalated (L2)</h4>
                  <h2>{escalatedCount}</h2>
                </div>
              </div>
            </div>
          </div>

          {/* Search bar */}
          <div className="soc-card mb-4" style={{ padding: "16px" }}>
            <div className="row g-2 align-items-center">
              <div className="col-lg-6">
                <div style={{ display: "flex", alignItems: "center", gap: "8px", width: "100%" }}>
                  <label style={{ margin: 0, fontWeight: "bold", color: "#475569", fontSize: "14px", whiteSpace: "nowrap", display: "inline-block" }}>Search:</label>
                  <div style={{ flexGrow: 1, position: "relative" }}>
                    <FaSearch className="position-absolute" style={{ left: "12px", top: "12px", color: "#94a3b8" }} />
                    <input
                      type="text"
                      className="soc-form-control py-1.5"
                      style={{ paddingLeft: "36px", fontSize: "14px" }}
                      placeholder="Search active alerts by title or category..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              <div className="col-lg-3">
                <select
                  className="soc-form-control py-1.5"
                  style={{ fontSize: "14px" }}
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                >
                  <option value="">Priority: All</option>
                  <option value="Critical">Critical</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                </select>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="soc-card py-5 text-center">
              <div className="spinner-border text-primary" role="status"></div>
              <p className="mt-2 text-muted">Listening for active threats...</p>
            </div>
          ) : (
            <div className="soc-table-wrapper">
              <table className="soc-table">
                <thead>
                  <tr>
                    <th>Alert ID</th>
                    <th>Threat Name</th>
                    <th>Category</th>
                    <th>Risk Priority</th>
                    <th>Current Status</th>
                    <th>Assigned Analyst</th>
                    <th className="text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAlerts.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="text-center py-5 text-muted">
                        No active security threat triggers match.
                      </td>
                    </tr>
                  ) : (
                    filteredAlerts.map(a => (
                      <tr key={a.id}>
                        <td><strong>{formatIncidentId(a.id)}</strong></td>
                        <td className="fw-semibold">{a.title}</td>
                        <td><span className="badge bg-light text-dark border">{a.category || "General"}</span></td>
                        <td>
                          <span className={`badge-status ${
                            a.priority === 'Critical' ? 'bg-danger-subtle text-danger' : 'bg-warning-subtle text-warning'
                          }`}>
                            {a.priority || "High"}
                          </span>
                        </td>
                        <td>
                          <span className="badge bg-light text-dark border">
                            {a.status}
                          </span>
                        </td>
                        <td>{a.assignedAnalystName || "Unassigned"}</td>
                        <td className="text-center">
                          <button 
                            onClick={() => navigate(`/incidents/${a.id}`)}
                            className="btn btn-sm btn-outline-primary d-flex align-items-center gap-1 mx-auto"
                          >
                            <span>Investigate</span> <FaArrowRight />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Alerts;
