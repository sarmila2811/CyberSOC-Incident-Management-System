import React, { useEffect, useState, useContext } from "react";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import { Link, useNavigate } from "react-router-dom";
import { FaShieldAlt, FaEye, FaArrowUp } from "react-icons/fa";
import { formatIncidentId, formatTimestamp, getAnalystLevel, formatSpecialization } from "../utils/format";
import { NotificationContext } from "../context/NotificationContext";

function MyIncidents() {
  const navigate = useNavigate();
  const [incidents, setIncidents] = useState([]);
  const { refreshTrigger } = useContext(NotificationContext);
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(true);

  const currentUser = JSON.parse(localStorage.getItem("currentUser") || "{}");
  const username = currentUser?.username;
  const role = currentUser?.role?.toUpperCase();

  const getStatusBadge = (status) => {
    const s = (status || "").toUpperCase();
    if (s === "OPEN") {
      return <span className="badge bg-info-subtle text-info border border-info-subtle fw-semibold">Open (Active)</span>;
    }
    if (s === "UNDER_INVESTIGATION") {
      return <span className="badge bg-primary-subtle text-primary border border-primary-subtle fw-semibold">Investigation (Active)</span>;
    }
    if (s === "ESCALATED") {
      return <span className="badge bg-danger-subtle text-danger border border-danger-subtle fw-semibold">Escalated (Active)</span>;
    }
    if (s === "RESOLVED" || s === "PENDING_APPROVAL" || s === "PENDING_ADMIN_APPROVAL") {
      return <span className="badge bg-success-subtle text-success border border-success-subtle fw-semibold">Resolved (Pending Approval)</span>;
    }
    if (s === "CLOSED") {
      return <span className="badge bg-secondary-subtle text-secondary border border-secondary-subtle fw-semibold">Closed (Resolved)</span>;
    }
    return <span className="badge bg-light text-dark border fw-semibold">{status}</span>;
  };

  const fetchIncidents = async () => {
    try {
      setLoading(true);
      const headers = { "Authorization": `Bearer ${localStorage.getItem("token")}` };

      let incidentsUrl = "http://localhost:8080/api/incidents";
      if (role === "ANALYST") {
        incidentsUrl = `http://localhost:8080/api/incidents/my-incidents/${username}`;
      } else if (role === "EMPLOYEE") {
        incidentsUrl = `http://localhost:8080/api/incidents/user/${username}`;
      }

      const [resInc, resUsers] = await Promise.all([
        fetch(incidentsUrl, { headers }),
        fetch("http://localhost:8080/api/users", { headers })
      ]);

      let activeData = [];
      if (resInc.ok) {
        const raw = await resInc.json();
        const seen = new Set();
        for (const item of raw) {
          if (item && item.id && !seen.has(item.id)) {
            seen.add(item.id);
            activeData.push(item);
          }
        }
      }

      let filtered = [];

      if (role === "EMPLOYEE") {
        filtered = activeData.filter(inc => 
          (inc.reportedBy || "").toLowerCase().trim() === (username || "").toLowerCase().trim()
        );
      } else if (role === "ADMIN") {
        filtered = activeData;
      } else {
        filtered = activeData.filter(inc => 
          (inc.assignedTo || "").toLowerCase().trim() === (username || "").toLowerCase().trim()
        );
      }

      setIncidents(filtered);

      if (resUsers.ok) {
        const dataUsers = await resUsers.json();
        setUsersList(dataUsers);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, [refreshTrigger]);

  const handleEscalate = async (id) => {
    if (!window.confirm("Escalate incident " + formatIncidentId(id) + " to L2?")) return;
    try {
      const res = await fetch(`http://localhost:8080/api/incidents/${id}/escalate`, {
        method: "PUT",
        headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
      });
      if (res.ok) {
        alert("Incident escalated successfully");
        fetchIncidents();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRowClick = (e, id) => {
    if (e.target.tagName === "SELECT" || e.target.tagName === "BUTTON" || e.target.tagName === "A" || e.target.closest("button") || e.target.closest("a")) {
      return;
    }
    navigate(`/incidents/${id}`);
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
            <span>My Security Caseload</span>
          </div>

          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h2 className="m-0 fw-bold">My Security Caseload</h2>
              <p className="text-muted m-0">Review and resolve security events currently assigned or reported by your account.</p>
            </div>
            <button onClick={fetchIncidents} className="btn btn-outline-secondary d-flex align-items-center gap-1.5 fw-bold shadow-sm py-2 px-3">
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="soc-table-wrapper py-5 text-center">
              <div className="spinner-border text-primary" role="status"></div>
              <p className="mt-2 text-muted">Retrieving caseload queue...</p>
            </div>
          ) : (
            <div className="soc-table-wrapper">
              <table className="soc-table align-middle">
                <thead>
                  <tr>
                    <th style={{ width: "80px", minWidth: "80px" }}>SI No.</th>
                    <th>Incident ID</th>
                    <th>Title</th>
                    <th>Category</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Assigned Analyst</th>
                    <th>Analyst Level</th>
                    <th>Created Date & Time</th>
                    <th>Last Updated</th>
                    <th className="text-center" style={{ width: "180px", minWidth: "180px" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {incidents.length === 0 ? (
                    <tr>
                      <td colSpan="11" className="text-center py-5 text-muted">
                        No incidents assigned or reported.
                      </td>
                    </tr>
                  ) : (
                    incidents.map((inc, index) => (
                      <tr 
                        key={inc.id}
                        onClick={(e) => handleRowClick(e, inc.id)}
                        style={{ cursor: "pointer" }}
                        className="hover-row-clickable"
                      >
                        <td><strong>{index + 1}</strong></td>
                        <td><strong>{formatIncidentId(inc.id)}</strong></td>
                        <td className="fw-semibold text-dark">
                          <Link to={`/incidents/${inc.id}`} className="text-dark text-decoration-none">
                            {inc.title}
                          </Link>
                        </td>
                        <td><span className="badge bg-light text-dark border">{formatSpecialization(inc.category) || "General"}</span></td>
                        <td>
                          <span className={`badge-status ${
                            inc.priority === 'Critical' ? 'bg-danger-subtle text-danger' :
                            inc.priority === 'High' ? 'bg-warning-subtle text-warning' :
                            inc.priority === 'Medium' ? 'bg-primary-subtle text-primary' : 'bg-success-subtle text-success'
                          }`}>
                            {inc.priority || "Medium"}
                          </span>
                        </td>
                        <td>
                          {getStatusBadge(inc.status)}
                        </td>
                        <td>{inc.assignedAnalystName || "Unassigned"}</td>
                        <td>{getAnalystLevel(inc.assignedTo, usersList)}</td>
                        <td><small className="text-muted">{formatTimestamp(inc.timestamp)}</small></td>
                        <td><small className="text-muted">{formatTimestamp(inc.approvedTime || inc.timestamp)}</small></td>
                        <td className="text-center" style={{ width: "180px", minWidth: "180px" }}>
                          <div className="d-flex justify-content-center gap-1.5">
                            <button
                              onClick={() => navigate(`/incidents/${inc.id}`)}
                              className="btn btn-sm btn-outline-primary"
                              title="Details"
                            >
                              <FaEye /> View
                            </button>
                            {role !== "EMPLOYEE" && inc.status !== "Escalated" && inc.status !== "Closed" && (
                              <button
                                onClick={() => handleEscalate(inc.id)}
                                className="btn btn-sm btn-outline-warning"
                                title="Escalate"
                              >
                                <FaArrowUp /> Escalate
                              </button>
                            )}
                          </div>
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

export default MyIncidents;