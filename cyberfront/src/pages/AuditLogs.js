import React, { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import { Link, useSearchParams } from "react-router-dom";
import { FaSearch, FaDownload, FaHistory } from "react-icons/fa";
import { formatIncidentId, formatTimestamp } from "../utils/format";

function ExpandableValueCell({ value }) {
  const [expanded, setExpanded] = useState(false);
  
  if (!value) return <span className="text-muted">N/A</span>;
  const isLong = value.length > 35;
  const displayText = expanded ? value : `${value.slice(0, 35)}...`;

  return (
    <div style={{ wordBreak: "break-all", whiteSpace: "pre-wrap", minWidth: "150px", maxWidth: "350px" }}>
      <span>{isLong ? displayText : value}</span>
      {isLong && (
        <button
          onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
          className="btn btn-link p-0 ms-1 text-decoration-none fw-bold"
          style={{ fontSize: "11px", display: "inline-block", verticalAlign: "baseline" }}
        >
          {expanded ? "Collapse" : "Expand"}
        </button>
      )}
    </div>
  );
}

function AuditLogs() {
  const [searchParams] = useSearchParams();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("");

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await fetch(window.API_BASE_URL + "/api/audit", {
        headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
      });
      if (res.ok) {
        const data = await res.json();
        setLogs(data || []);
      }
    } catch (err) {
      console.error("Audit fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    const searchParam = searchParams.get("search");
    if (searchParam) {
      setSearch(searchParam);
    }
  }, [searchParams]);

  // Filter logs
  const filtered = logs.filter(l => {
    const q = search.toLowerCase();
    const matchSearch = !search ||
      (l.user || "").toLowerCase().includes(q) ||
      (l.incidentId || "").toLowerCase().includes(q) ||
      (l.incidentTitle || "").toLowerCase().includes(q) ||
      (l.remarks || "").toLowerCase().includes(q);
    
    const matchAction = !actionFilter || l.action === actionFilter;

    return matchSearch && matchAction;
  });

  // Export CSV
  const handleExportCSV = () => {
    const headers = ["ID", "Username", "Action Triggered", "Incident ID", "Title Reference", "Old State", "New State", "Timestamp"];
    const rows = filtered.map(l => [
      l.id,
      l.user,
      l.action,
      l.incidentId || "N/A",
      `"${l.incidentTitle ? l.incidentTitle.replace(/"/g, '""') : 'N/A'}"`,
      `"${l.oldValue ? l.oldValue.replace(/"/g, '""') : 'N/A'}"`,
      `"${l.newValue ? l.newValue.replace(/"/g, '""') : 'N/A'}"`,
      l.timestamp
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `cybersoc_audit_logs_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="app-wrapper">
      <Navbar />
      <div className="page-container">
        <Sidebar />
        <div className="main-content">
          <div className="soc-breadcrumb">
            <Link to="/dashboard">Home</Link>
            <span>/</span>
            <span>Audit Trail Logs</span>
          </div>

          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h2 className="m-0 fw-bold">Audit Trail Console</h2>
              <p className="text-muted m-0">Immutable, database-driven logging of SOC actions & configurations.</p>
            </div>
            <div className="d-flex gap-2">
              <button onClick={fetchLogs} className="btn btn-outline-secondary d-flex align-items-center gap-1.5 fw-semibold">
                Refresh
              </button>
              <button onClick={handleExportCSV} className="btn btn-soc btn-outline-secondary fw-semibold">
                <FaDownload /> Download CSV logs
              </button>
            </div>
          </div>

          {/* Search filtering */}
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
                      placeholder="Search user, incident, remarks..."
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
                  value={actionFilter}
                  onChange={(e) => setActionFilter(e.target.value)}
                >
                  <option value="">Filter Action: All</option>
                  <option value="INCIDENT CREATED">Incident Created</option>
                  <option value="INCIDENT REPORTED">Incident Reported</option>
                  <option value="INCIDENT ASSIGNED">Incident Assigned</option>
                  <option value="INCIDENT ESCALATED">Incident Escalated</option>
                  <option value="INCIDENT APPROVED & RESOLVED">Resolution Approved</option>
                  <option value="STATUS UPDATED">Status Updated</option>
                  <option value="NOTES UPDATED">Notes Updated</option>
                </select>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="soc-card py-5 text-center">
              <div className="spinner-border text-primary" role="status"></div>
              <p className="mt-2 text-muted">Loading audit entries...</p>
            </div>
          ) : (
            <div className="soc-table-wrapper">
              <table className="soc-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>User</th>
                    <th>Action</th>
                    <th>Incident</th>
                    <th>Previous Value</th>
                    <th>Updated Value</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="text-center py-5 text-muted">
                        No audit trail records match.
                      </td>
                    </tr>
                  ) : (
                    filtered.map(l => (
                      <tr key={l.id}>
                        <td><small className="text-muted">{formatTimestamp(l.timestamp)}</small></td>
                        <td><strong>{l.user}</strong></td>
                        <td>
                          <span className="badge bg-light text-dark border">
                            {l.action}
                          </span>
                        </td>
                        <td>
                           {l.incidentId ? (
                             <Link to={`/incidents/${l.incidentId}`} className="text-decoration-none fw-semibold">
                               {formatIncidentId(l.incidentId)} - {l.incidentTitle}
                             </Link>
                           ) : "N/A"}
                        </td>
                        <td>
                           <ExpandableValueCell value={l.oldValue} />
                         </td>
                         <td>
                           <ExpandableValueCell value={l.newValue} />
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

export default AuditLogs;