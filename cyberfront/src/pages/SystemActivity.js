import React, { useEffect, useState, useCallback, useContext } from "react";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import { Link, useNavigate } from "react-router-dom";
import { 
  FaSearch, FaPlusCircle, FaUserCheck, 
  FaArrowUp, FaCheckCircle, FaEdit, FaTimesCircle, 
  FaInfoCircle, FaLock 
} from "react-icons/fa";
import { useAuth } from "../context/AuthContext";
import { formatIncidentId, formatTimestamp } from "../utils/format";
import { NotificationContext } from "../context/NotificationContext";

function SystemActivity() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { refreshTrigger } = useContext(NotificationContext);
  const role = user?.role?.toUpperCase();
  const currentUser = user || {};

  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const fetchActivities = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:8080/api/audit", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        let filteredData = data || [];

        // Role based filtering logic (identical to Dashboard)
        if (role === "EMPLOYEE") {
          filteredData = filteredData.filter(a => a.user === currentUser.username || (a.action === "INCIDENT REPORTED" && a.user === currentUser.username));
        } else if (role === "ANALYST") {
          filteredData = filteredData.filter(a => a.user === currentUser.username || (a.action === "INCIDENT ASSIGNED" && a.newValue === currentUser.username));
        }

        setActivities(filteredData);
      }
    } catch (err) {
      console.error("Activity fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [role, currentUser.username]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities, refreshTrigger]);

  // Dynamic activity icon matcher
  const getActivityIcon = (action) => {
    const act = (action || "").toUpperCase();
    if (act.includes("REPORTED") || act.includes("CREATED")) {
      return <FaPlusCircle className="text-success" />;
    } else if (act.includes("ASSIGNED")) {
      return <FaUserCheck className="text-primary" />;
    } else if (act.includes("ESCALATED")) {
      return <FaArrowUp className="text-danger" />;
    } else if (act.includes("APPROVED") || act.includes("RESOLVED")) {
      return <FaCheckCircle className="text-success" />;
    } else if (act.includes("REJECTED")) {
      return <FaTimesCircle className="text-warning" />;
    } else if (act.includes("NOTES") || act.includes("COMMENT")) {
      return <FaEdit className="text-info" />;
    } else if (act.includes("LOGIN") || act.includes("SIGNUP")) {
      return <FaLock className="text-secondary" />;
    }
    return <FaInfoCircle className="text-secondary" />;
  };

  // Search & Filter
  const filtered = activities.filter(act => {
    const q = search.toLowerCase();
    const matchSearch = !search ||
      (act.action || "").toLowerCase().includes(q) ||
      (act.remarks || "").toLowerCase().includes(q) ||
      (act.user || "").toLowerCase().includes(q) ||
      (act.incidentId || "").toString().includes(q);

    const matchAction = !actionFilter || act.action === actionFilter;

    return matchSearch && matchAction;
  });

  // Pagination Math
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filtered.slice(indexOfFirstItem, indexOfLastItem);

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleRowClick = (act) => {
    if (act.incidentId) {
      navigate(`/incidents/${act.incidentId}`);
    }
  };

  return (
    <div className="app-wrapper">
      <Navbar />
      <div className="page-container">
        <Sidebar />
        <div className="main-content">
          {/* Breadcrumb */}
          <div className="soc-breadcrumb">
            <Link to="/dashboard">Home</Link>
            <span>/</span>
            <span>System Activity Logs</span>
          </div>

          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h2 className="m-0 fw-bold">System Operations Activity</h2>
              <p className="text-muted m-0">Review system activity events, updates, and operations audits.</p>
            </div>
          </div>

          {/* Filtering row */}
          <div className="soc-card mb-4" style={{ padding: "16px" }}>
            <div className="row g-2 align-items-center">
              <div className="col-lg-5">
                <div style={{ display: "flex", alignItems: "center", gap: "8px", width: "100%" }}>
                  <label style={{ margin: 0, fontWeight: "bold", color: "#475569", fontSize: "14px", whiteSpace: "nowrap", display: "inline-block" }}>Search:</label>
                  <div style={{ flexGrow: 1, position: "relative" }}>
                    <FaSearch className="position-absolute" style={{ left: "12px", top: "12px", color: "#94a3b8" }} />
                    <input
                      type="text"
                      className="soc-form-control py-1.5"
                      style={{ paddingLeft: "36px", fontSize: "14px" }}
                      placeholder="Search activity remarks, user, action..."
                      value={search}
                      onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                    />
                  </div>
                </div>
              </div>
              <div className="col-lg-3">
                <select
                  className="soc-form-control py-1.5"
                  style={{ fontSize: "14px" }}
                  value={actionFilter}
                  onChange={(e) => { setActionFilter(e.target.value); setCurrentPage(1); }}
                >
                  <option value="">Filter Activity: All</option>
                  <option value="INCIDENT REPORTED">Incident Reported</option>
                  <option value="INCIDENT CREATED">Incident Created</option>
                  <option value="INCIDENT ASSIGNED">Incident Assigned</option>
                  <option value="INCIDENT ESCALATED">Incident Escalated</option>
                  <option value="INCIDENT APPROVED & RESOLVED">Incident Resolved</option>
                  <option value="INCIDENT REJECTED">Incident Rejected</option>
                  <option value="STATUS UPDATED">Status Updated</option>
                  <option value="NOTES UPDATED">Notes Updated</option>
                </select>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="soc-card py-5 text-center">
              <div className="spinner-border text-primary" role="status"></div>
              <p className="mt-2 text-muted">Retrieving operations logs...</p>
            </div>
          ) : (
            <>
              <div className="soc-table-wrapper">
                <table className="soc-table">
                  <thead>
                    <tr>
                      <th style={{ width: "60px" }}>Icon</th>
                      <th>Activity Type</th>
                      <th>Description</th>
                      <th>User</th>
                      <th>Incident Ref</th>
                      <th>Date & Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentItems.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="text-center py-5 text-muted">
                          No operations activity records found.
                        </td>
                      </tr>
                    ) : (
                      currentItems.map((act, index) => (
                        <tr 
                          key={index}
                          style={{ cursor: act.incidentId ? "pointer" : "default" }}
                          onClick={() => handleRowClick(act)}
                          className={act.incidentId ? "hover-row-clickable" : ""}
                        >
                          <td className="text-center" style={{ fontSize: "18px" }}>
                            {getActivityIcon(act.action)}
                          </td>
                          <td>
                            <span className="badge bg-light text-dark border text-uppercase font-monospace" style={{ fontSize: "11px" }}>
                              {act.action}
                            </span>
                          </td>
                          <td className="fw-semibold text-dark">{act.remarks || "N/A"}</td>
                          <td><strong>{act.user}</strong></td>
                          <td>
                            {act.incidentId ? (
                              <span className="text-primary fw-semibold">{formatIncidentId(act.incidentId)}</span>
                            ) : (
                              <span className="text-muted">N/A</span>
                            )}
                          </td>
                          <td>
                            <small className="text-muted">{formatTimestamp(act.timestamp)}</small>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination controls */}
              {totalPages > 1 && (
                <div className="d-flex justify-content-between align-items-center mt-4">
                  <span className="text-muted" style={{ fontSize: "14px" }}>
                    Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filtered.length)} of {filtered.length} entries
                  </span>
                  <div className="d-flex gap-1.5">
                    <button
                      className="btn btn-sm btn-outline-secondary"
                      disabled={currentPage === 1}
                      onClick={() => handlePageChange(currentPage - 1)}
                    >
                      Previous
                    </button>
                    {[...Array(totalPages)].map((_, i) => (
                      <button
                        key={i}
                        className={`btn btn-sm ${currentPage === i + 1 ? 'btn-primary' : 'btn-outline-secondary'}`}
                        onClick={() => handlePageChange(i + 1)}
                      >
                        {i + 1}
                      </button>
                    ))}
                    <button
                      className="btn btn-sm btn-outline-secondary"
                      disabled={currentPage === totalPages}
                      onClick={() => handlePageChange(currentPage + 1)}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default SystemActivity;
