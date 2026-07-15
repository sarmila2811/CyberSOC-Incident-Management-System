import React, { useEffect, useState, useContext } from "react";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import { Link } from "react-router-dom";
import { FaDownload, FaInfoCircle } from "react-icons/fa";
import { NotificationContext } from "../context/NotificationContext";

function AnalystPerformance() {
  const [analysts, setAnalysts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { refreshTrigger } = useContext(NotificationContext);

  const loadAnalysts = async () => {
    try {
      setLoading(true);
      const headers = { "Authorization": `Bearer ${localStorage.getItem("token")}` };
      const [resStats, resUsers] = await Promise.all([
        fetch(window.API_BASE_URL + "/api/reports/statistics", { headers }),
        fetch(window.API_BASE_URL + "/api/users", { headers })
      ]);

      if (resStats.ok && resUsers.ok) {
        const statsData = await resStats.json();
        const usersData = await resUsers.json();

        // Merge stats with profileImage and status from users registry
        const merged = (statsData.analystPerformance || []).map(perf => {
          const userObj = usersData.find(u => u.username && u.username.toLowerCase() === (perf.username || "").toLowerCase());
          return {
            ...perf,
            profileImage: userObj ? userObj.profileImage : "",
            status: userObj ? userObj.status : "ACTIVE"
          };
        });
        setAnalysts(merged);
      }
    } catch (err) {
      console.error("Error loading analysts stats:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      const headers = { "Authorization": `Bearer ${localStorage.getItem("token")}` };
      const resRes = await fetch(window.API_BASE_URL + "/api/incidents/resolved", { headers });
      let resolvedIncidents = [];
      if (resRes.ok) {
        resolvedIncidents = await resRes.json();
      }

      const csvHeaders = ["Analyst", "Specialization", "Level", "Assigned", "Resolved", "Average Resolution Time"];
      const rows = analysts.map(a => {
        const myResolved = resolvedIncidents.filter(r => (r.assignedAnalyst || "").toLowerCase() === (a.username || "").toLowerCase());
        let avgTimeText = "N/A";
        let totalMs = 0;
        let count = 0;
        myResolved.forEach(r => {
          if (r.resolvedTime && r.timestamp) {
            const diff = new Date(r.resolvedTime) - new Date(r.timestamp);
            if (diff > 0) {
              totalMs += diff;
              count++;
            }
          }
        });
        if (count > 0) {
          avgTimeText = `${(totalMs / (1000 * 60 * 60 * count)).toFixed(1)} Hours`;
        }

        return [
          `"${(a.fullName || a.username || "").replace(/"/g, '""')}"`,
          a.specialization || "Generalist",
          a.level || "L1",
          a.activeCount || 0,
          a.resolvedCount || 0,
          avgTimeText
        ];
      });

      const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
        + [csvHeaders.join(","), ...rows.map(r => r.join(","))].join("\n");
      
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `cybersoc_analyst_performance_${new Date().toISOString().slice(0,10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("CSV Export failed:", err);
    }
  };

  useEffect(() => {
    loadAnalysts();
  }, [refreshTrigger]);

  return (
    <div className="app-wrapper">
      <Navbar />
      <div className="page-container">
        <Sidebar />
        <div className="main-content">
          <div className="soc-breadcrumb">
            <Link to="/dashboard">Home</Link>
            <span>/</span>
            <span>Analyst Performance</span>
          </div>

          <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
            <div>
              <h2 className="m-0 fw-bold">Analyst Performance & Workloads</h2>
              <p className="text-muted m-0">Review current active caseloads, resolutions, and specializations of the SOC team.</p>
            </div>
            <button onClick={handleExportCSV} className="btn btn-outline-success d-flex align-items-center gap-2 shadow-sm py-2 px-3 fw-bold">
              <FaDownload /> Export CSV
            </button>
          </div>

          <div className="soc-card mb-4 p-3 bg-light-subtle border" style={{ borderRadius: "8px" }}>
            <h5 className="fw-bold text-dark mb-2">Adaptive Analyst Performance-Based Assignment Engine</h5>
            <p className="text-muted mb-2" style={{ fontSize: "13px" }}>
              Incidents are routed to the active analyst with the highest <strong>Assignment Score</strong>:
            </p>
            <div className="row g-3" style={{ fontSize: "12.5px" }}>
              <div className="col-md-6">
                <div className="p-2 bg-white rounded border h-100">
                  <strong>Assignment Score Formula:</strong><br />
                  <code style={{ fontSize: "11px" }}>(40% × Specialization Match) + (30% × Workload Score) + (30% × Performance Score)</code>
                </div>
              </div>
              <div className="col-md-6">
                <div className="p-2 bg-white rounded border h-100">
                  <strong>Performance Score Formula:</strong><br />
                  <code style={{ fontSize: "11px" }}>Performance Score = Resolution Rate (%) = (Closed Incidents / Total Assigned Incidents) × 100</code>
                </div>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="soc-card py-5 text-center">
              <div className="spinner-border text-primary" role="status"></div>
              <p className="mt-2 text-muted">Calculating analyst caseloads...</p>
            </div>
          ) : (
            <div className="soc-table-wrapper" style={{ overflowX: "auto" }}>
              <table className="soc-table align-middle" style={{ minWidth: "1200px" }}>
                <thead>
                  <tr>
                    <th>Profile</th>
                    <th>Analyst Name</th>
                    <th>Level</th>
                    <th>Specialization</th>
                    <th className="text-center">Total Assigned</th>
                    <th className="text-center">Active Incidents</th>
                    <th className="text-center">Closed Incidents</th>
                    <th className="text-center">Resolution Rate (%)</th>
                    <th className="text-center">Performance Score</th>
                    <th className="text-center">
                      Assignment Score{" "}
                      <FaInfoCircle 
                        className="text-info cursor-pointer"
                        style={{ fontSize: "12px", marginLeft: "4px", cursor: "pointer" }}
                        onClick={() => alert("Assignment Score is calculated using:\n40% Specialization Match\n30% Current Workload\n30% Historical Resolution Performance")}
                      />
                    </th>
                    <th>Performance Status</th>
                  </tr>
                </thead>
                <tbody>
                  {analysts.length === 0 ? (
                    <tr>
                      <td colSpan="11" className="text-center py-5 text-muted">
                        No analysts registered in the SOC.
                      </td>
                    </tr>
                  ) : (
                    analysts.map((a, idx) => {
                      const specScore = 100.0; // Assume matching specialization for base visualization
                      const workloadScore = Math.max(0.0, 100.0 - (a.activeCount || 0) * 10.0);
                      const perfScore = a.performanceScore !== undefined ? a.performanceScore : 0.0;
                      const assignmentScore = (0.40 * specScore) + (0.30 * workloadScore) + (0.30 * perfScore);

                      let statusBadgeClass = "bg-danger text-white";
                      if (a.performanceStatus === "Excellent") {
                        statusBadgeClass = "bg-success text-white";
                      } else if (a.performanceStatus === "Good") {
                        statusBadgeClass = "bg-warning text-dark border border-warning-subtle";
                      } else if (a.performanceStatus === "Average") {
                        statusBadgeClass = "bg-info text-dark border border-info-subtle";
                      } else if (a.performanceStatus === "No History") {
                        statusBadgeClass = "bg-secondary text-white";
                      }

                      return (
                        <tr key={idx}>
                          <td>
                            {a.profileImage ? (
                              <img
                                src={`${window.API_BASE_URL}${a.profileImage}`}
                                alt="Avatar"
                                className="rounded-circle border"
                                style={{ width: "32px", height: "32px", objectFit: "cover" }}
                              />
                            ) : (
                              <div 
                                className="rounded-circle bg-secondary d-flex align-items-center justify-content-center text-white fw-bold"
                                style={{ width: "32px", height: "32px", fontSize: "12px" }}
                              >
                                {(a.fullName || a.username || "?").charAt(0).toUpperCase()}
                              </div>
                            )}
                          </td>
                          <td className="fw-semibold text-dark">{a.fullName}</td>
                          <td>
                            <span className="badge bg-light text-dark border">
                              {a.level || "L1"}
                            </span>
                          </td>
                          <td>
                            <span className="badge bg-primary-subtle text-primary">
                              {a.specialization || "Generalist"}
                            </span>
                          </td>
                          <td className="text-center fw-bold text-dark">{a.totalAssigned || 0}</td>
                          <td className="text-center fw-bold text-primary">{a.activeCount || 0}</td>
                          <td className="text-center fw-bold text-success">{a.resolvedCount || 0}</td>
                          <td className="text-center fw-bold">{a.resolutionRate !== undefined && a.resolutionRate >= 0 ? `${a.resolutionRate.toFixed(2)}%` : "N/A"}</td>
                          <td className="text-center fw-bold text-dark">{a.performanceScore !== undefined ? a.performanceScore.toFixed(2) : "0.00"}</td>
                          <td className="text-center fw-bold text-purple" style={{ color: "#6f42c1" }}>{assignmentScore.toFixed(2)}</td>
                          <td>
                            <span className={`badge ${statusBadgeClass}`} style={{ padding: "6px 12px", fontSize: "12px", fontWeight: "600" }}>
                              {a.performanceStatus || "Needs Improvement"}
                            </span>
                          </td>
                        </tr>
                      );
                    })
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

export default AnalystPerformance;