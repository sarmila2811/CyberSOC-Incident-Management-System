import React, { useEffect, useState, useContext } from "react";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import { Link, useNavigate } from "react-router-dom";
import { FaCheck, FaTimes, FaEye, FaShieldAlt } from "react-icons/fa";
import { formatIncidentId, formatTimestamp, getAnalystLevel, formatSpecialization } from "../utils/format";
import { NotificationContext } from "../context/NotificationContext";

function ApprovalQueue() {
  const navigate = useNavigate();
  const [incidents, setIncidents] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const { refreshTrigger, triggerRefresh } = useContext(NotificationContext);



  const fetchPendingApproval = async () => {
    try {
      setLoading(true);
      const headers = { "Authorization": `Bearer ${localStorage.getItem("token")}` };
      const res = await fetch("http://localhost:8080/api/incidents/pending-approval", { headers });
      if (res.ok) {
        const data = await res.json();
        const pending = (data || []).filter(i => {
          const s = (i.status || "").toUpperCase();
          return s === "PENDING_APPROVAL" || s === "PENDING_ADMIN_APPROVAL" || s === "PENDING APPROVAL";
        });
        setIncidents(pending);
      }

      // Fetch users roster to display Analyst Level
      const resUsers = await fetch("http://localhost:8080/api/users", { headers });
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
    fetchPendingApproval();
  }, [refreshTrigger]);

  const handleApprove = async (id) => {
    if (!window.confirm("Approve and close this incident?")) return;
    try {
      const res = await fetch(`http://localhost:8080/api/incidents/${id}/approve`, {
        method: "PUT",
        headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
      });
      if (res.ok) {
        alert("Incident resolution approved and closed");
        fetchPendingApproval();
        triggerRefresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleReject = async (id) => {
    const reason = window.prompt("Provide rejection reason:");
    if (reason === null) return;
    if (!reason.trim()) {
      alert("Rejection reason is required.");
      return;
    }
    try {
      const res = await fetch(`http://localhost:8080/api/incidents/${id}/reject`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({ rejectionReason: reason })
      });
      if (res.ok) {
        alert("Incident returned to investigator");
        fetchPendingApproval();
        triggerRefresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRowClick = (e, id) => {
    if (e.target.tagName === "BUTTON" || e.target.tagName === "A" || e.target.closest("button") || e.target.closest("a")) {
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
            <span>Resolution Approval Queue</span>
          </div>

          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h2 className="m-0 fw-bold">Resolution Approval Queue</h2>
              <p className="text-muted m-0">Review mitigation logs, findings, and approve/reject resolutions to close incidents.</p>
            </div>
            <button onClick={fetchPendingApproval} className="btn btn-outline-secondary d-flex align-items-center gap-1.5 fw-bold shadow-sm py-2 px-3">
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="soc-table-wrapper py-5 text-center">
              <div className="spinner-border text-primary" role="status"></div>
              <p className="mt-2 text-muted">Retrieving approval queue...</p>
            </div>
          ) : (
            <div className="soc-table-wrapper">
              <table className="soc-table align-middle">
                <thead>
                  <tr>
                    <th style={{ width: "80px", minWidth: "80px" }}>SI No.</th>
                    <th>Incident ID</th>
                    <th>Incident Title</th>
                    <th>Category</th>
                    <th>Previous Priority</th>
                    <th>New Priority</th>
                    <th>Risk Level</th>
                    <th>Confidence Score</th>
                    <th>Generated Time</th>
                    <th>Assigned Analyst</th>
                    <th>Created Date & Time</th>
                    <th className="text-center" style={{ width: "300px", minWidth: "300px" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {incidents.length === 0 ? (
                    <tr>
                      <td colSpan="12" className="text-center py-5 text-muted">
                        No resolutions currently pending review.
                      </td>
                    </tr>
                  ) : (
                    incidents.map((i, index) => (
                      <tr 
                        key={i.id}
                        onClick={(e) => handleRowClick(e, i.id)}
                        style={{ cursor: "pointer" }}
                        className="hover-row-clickable"
                      >
                        <td><strong>{index + 1}</strong></td>
                        <td><strong>{formatIncidentId(i.id)}</strong></td>
                        <td className="fw-semibold text-dark">{i.title}</td>
                        <td><span className="badge bg-light text-dark border">{formatSpecialization(i.category) || "General"}</span></td>
                        <td>
                          <span className={`badge-status ${
                            i.previousPriority === 'Critical' ? 'bg-danger-subtle text-danger' :
                            i.previousPriority === 'High' ? 'bg-warning-subtle text-warning' :
                            i.previousPriority === 'Medium' ? 'bg-primary-subtle text-primary' : 
                            i.previousPriority === 'Low' ? 'bg-success-subtle text-success' : 'bg-secondary-subtle text-secondary'
                          }`}>
                            {i.previousPriority || "—"}
                          </span>
                        </td>
                        <td>
                          <span className={`badge-status ${
                            i.priority === 'Critical' ? 'bg-danger-subtle text-danger' :
                            i.priority === 'High' ? 'bg-warning-subtle text-warning' :
                            i.priority === 'Medium' ? 'bg-primary-subtle text-primary' : 'bg-success-subtle text-success'
                          }`}>
                            {i.priority || "Medium"}
                          </span>
                        </td>
                        <td>
                          <span className={`badge bg-${
                            i.aiAssistantRiskLevel === 'Critical' || i.aiAssistantRiskLevel === 'High' ? 'danger-subtle text-danger' :
                            i.aiAssistantRiskLevel === 'Medium' ? 'warning-subtle text-warning' : 'success-subtle text-success'
                          } border`}>
                            {i.aiAssistantRiskLevel || "—"}
                          </span>
                        </td>
                        <td><strong className="text-dark">{i.aiAssistantConfidenceScore || "—"}</strong></td>
                        <td><small className="text-muted">{i.aiAssistantGeneratedTime ? formatTimestamp(i.aiAssistantGeneratedTime) : "—"}</small></td>
                        <td>{i.assignedAnalystName || "Unassigned"}</td>
                        <td><small className="text-muted">{formatTimestamp(i.timestamp)}</small></td>
                        <td className="text-center" style={{ width: "300px", minWidth: "300px" }}>
                          <div className="d-flex justify-content-center gap-1">
                            <button
                              onClick={() => navigate(`/incidents/${i.id}`)}
                              className="btn btn-sm btn-outline-primary"
                              title="Details"
                            >
                              <FaEye /> View
                            </button>
                            <button
                              onClick={() => handleApprove(i.id)}
                              className="btn btn-sm btn-outline-success"
                              title="Approve Resolution"
                            >
                              <FaCheck /> Approve
                            </button>
                            <button
                              onClick={() => handleReject(i.id)}
                              className="btn btn-sm btn-outline-danger"
                              title="Reject Resolution"
                            >
                              <FaTimes /> Reject
                            </button>
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

export default ApprovalQueue;