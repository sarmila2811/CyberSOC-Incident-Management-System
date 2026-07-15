import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import BackButton from "../components/BackButton";
import { formatIncidentId, formatTimestamp, getAnalystLevel } from "../utils/format";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, AreaChart, Area } from "recharts";
import { FaUser, FaPhone, FaEnvelope, FaBuilding, FaInfoCircle, FaCalendarAlt, FaShieldAlt } from "react-icons/fa";

function EmployeeDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [incidents, setIncidents] = useState([]);
  const [activities, setActivities] = useState([]);
  const [users, setUsers] = useState([]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const headers = { "Authorization": `Bearer ${localStorage.getItem("token")}` };

      const [resUser, resActive, resResolved, resAudit, resUsersAll] = await Promise.all([
        fetch(`http://localhost:8080/api/users/${id}`, { headers }),
        fetch("http://localhost:8080/api/incidents", { headers }),
        fetch("http://localhost:8080/api/incidents/resolved", { headers }),
        fetch("http://localhost:8080/api/audit", { headers }),
        fetch("http://localhost:8080/api/users", { headers })
      ]);

      if (resUser.ok && resActive.ok && resResolved.ok && resAudit.ok && resUsersAll.ok) {
        const empData = await resUser.json();
        setEmployee(empData);

        const activeList = await resActive.json();
        const resolvedList = await resResolved.json();
        const auditList = await resAudit.json();
        const allUsers = await resUsersAll.json();
        setUsers(allUsers);

        const usernameLower = (empData.username || "").toLowerCase();

        // 1. Employee Incidents History (Active + Resolved)
        const empActive = activeList.filter(i => (i.reportedBy || "").toLowerCase() === usernameLower);
        const empResolved = resolvedList.filter(i => (i.reportedBy || "").toLowerCase() === usernameLower);

        const combinedHistory = [
          ...empActive.map(i => ({
            id: i.id,
            title: i.title,
            category: i.category,
            priority: i.priority,
            status: i.status,
            assignedAnalyst: i.assignedAnalystName || "Unassigned",
            assignedTo: i.assignedTo,
            createdDate: i.timestamp,
            resolvedDate: "—"
          })),
          ...empResolved.map(r => ({
            id: r.incidentId,
            title: r.title,
            category: r.category,
            priority: r.priority,
            status: "Closed",
            assignedAnalyst: r.assignedAnalyst || "System",
            assignedTo: r.assignedAnalyst,
            createdDate: r.timestamp || r.resolvedTime,
            resolvedDate: r.resolvedTime
          }))
        ];

        setIncidents(combinedHistory);

        // 2. Employee Recent Activities (from audit logs)
        const empActivities = auditList.filter(a => a.user === empData.username);
        setActivities(empActivities.slice(0, 10));
      }
    } catch (err) {
      console.error("Error fetching employee details:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  if (loading) {
    return (
      <div className="app-wrapper">
        <Navbar />
        <div className="page-container">
          <Sidebar />
          <div className="main-content py-5 text-center">
            <div className="spinner-border text-primary" role="status"></div>
            <p className="mt-2 text-muted">Loading employee details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="app-wrapper">
        <Navbar />
        <div className="page-container">
          <Sidebar />
          <div className="main-content">
            <BackButton />
            <div className="alert alert-warning mt-3">Employee account records could not be found.</div>
          </div>
        </div>
      </div>
    );
  }

  // Calculate Metrics
  const totalReports = incidents.length;
  const resolvedCount = incidents.filter(i => i.status === "Closed" || i.status === "Resolved").length;
  const criticalCount = incidents.filter(i => i.priority === "Critical").length;

  const priorityData = [
    { name: "Critical", value: incidents.filter(i => i.priority === "Critical").length, color: "#dc3545" },
    { name: "High", value: incidents.filter(i => i.priority === "High").length, color: "#fd7e14" },
    { name: "Medium", value: incidents.filter(i => i.priority === "Medium").length, color: "#0dcaf0" },
    { name: "Low", value: incidents.filter(i => i.priority === "Low").length, color: "#198754" }
  ].filter(d => d.value > 0);

  const categoryCounts = {};
  incidents.forEach(i => {
    categoryCounts[i.category] = (categoryCounts[i.category] || 0) + 1;
  });
  const categoryData = Object.keys(categoryCounts).map(key => ({
    name: key,
    value: categoryCounts[key]
  }));

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
          <BackButton />
          
          <div className="soc-breadcrumb mt-3">
            <Link to="/dashboard">Home</Link>
            <span>/</span>
            <Link to="/employees">Employee Directory</Link>
            <span>/</span>
            <span>Profile Details</span>
          </div>

          <div className="row g-4 mt-1">
            {/* Left Column Profile info */}
            <div className="col-lg-4">
              <div className="soc-card text-center shadow-sm p-4 h-100">
                <div className="mb-3 position-relative d-inline-block">
                  {employee.profileImage ? (
                    <img
                      src={`http://localhost:8080${employee.profileImage}`}
                      alt={employee.fullName}
                      className="rounded-circle border border-primary p-1 shadow-sm"
                      style={{ width: "120px", height: "120px", objectFit: "cover" }}
                    />
                  ) : (
                    <div 
                      className="rounded-circle bg-primary-subtle text-primary fw-bold d-flex align-items-center justify-content-center mx-auto border border-primary p-1 shadow-sm"
                      style={{ width: "120px", height: "120px", fontSize: "36px" }}
                    >
                      {employee.fullName ? employee.fullName.charAt(0).toUpperCase() : "?"}
                    </div>
                  )}
                </div>

                <h4 className="fw-bold text-dark mb-1">{employee.fullName}</h4>
                <p className="badge bg-primary text-white px-3 py-1.5 rounded-pill mb-4 text-uppercase" style={{ fontSize: "11px", letterSpacing: "0.5px" }}>
                  {employee.role}
                </p>

                <div className="d-flex flex-column gap-3 text-start border-top pt-3" style={{ fontSize: "13.5px" }}>
                  <div className="d-flex align-items-center gap-2.5">
                    <FaEnvelope className="text-muted" />
                    <div>
                      <small className="text-muted d-block" style={{ fontSize: "10px" }}>Email Address</small>
                      <span className="text-dark fw-semibold">{employee.email || "N/A"}</span>
                    </div>
                  </div>

                  <div className="d-flex align-items-center gap-2.5">
                    <FaPhone className="text-muted" />
                    <div>
                      <small className="text-muted d-block" style={{ fontSize: "10px" }}>Phone Number</small>
                      <span className="text-dark fw-semibold">{employee.phone || "N/A"}</span>
                    </div>
                  </div>

                  <div className="d-flex align-items-center gap-2.5">
                    <FaBuilding className="text-muted" />
                    <div>
                      <small className="text-muted d-block" style={{ fontSize: "10px" }}>Department</small>
                      <span className="text-dark fw-semibold">{employee.department || "N/A"}</span>
                    </div>
                  </div>

                  <div className="d-flex align-items-center gap-2.5">
                    <FaCalendarAlt className="text-muted" />
                    <div>
                      <small className="text-muted d-block" style={{ fontSize: "10px" }}>Last Active Session</small>
                      <span className="text-dark fw-semibold">{employee.lastLogin ? formatTimestamp(employee.lastLogin) : "Never Login"}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column metrics */}
            <div className="col-lg-8">
              <div className="row g-3 mb-4">
                <div className="col-md-4">
                  <div className="kpi-card bg-white border p-3 rounded shadow-sm text-center">
                    <h5 className="text-muted m-0" style={{ fontSize: "13px" }}>Total Reports</h5>
                    <h2 className="m-0 fw-bold text-primary mt-1">{totalReports}</h2>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="kpi-card bg-white border p-3 rounded shadow-sm text-center">
                    <h5 className="text-muted m-0" style={{ fontSize: "13px" }}>Resolved Alerts</h5>
                    <h2 className="m-0 fw-bold text-success mt-1">{resolvedCount}</h2>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="kpi-card bg-white border p-3 rounded shadow-sm text-center">
                    <h5 className="text-muted m-0" style={{ fontSize: "13px" }}>Critical Issues</h5>
                    <h2 className="m-0 fw-bold text-danger mt-1">{criticalCount}</h2>
                  </div>
                </div>
              </div>

              {/* Recharts visualizations */}
              <div className="row g-3">
                <div className="col-md-6">
                  <div className="soc-card p-3 border shadow-sm">
                    <div className="soc-card-title fw-bold mb-3">Priorities Raised</div>
                    {priorityData.length === 0 ? (
                      <p className="text-muted text-center py-5">No priority analytics recorded.</p>
                    ) : (
                      <div style={{ height: "180px" }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={priorityData}
                              cx="50%"
                              cy="50%"
                              outerRadius={65}
                              dataKey="value"
                            >
                              {priorityData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>
                </div>

                <div className="col-md-6">
                  <div className="soc-card p-3 border shadow-sm">
                    <div className="soc-card-title fw-bold mb-3">Threat Categories Raised</div>
                    {categoryData.length === 0 ? (
                      <p className="text-muted text-center py-5">No category analytics recorded.</p>
                    ) : (
                      <div style={{ height: "180px" }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={categoryData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="name" stroke="#94a3b8" />
                            <YAxis stroke="#94a3b8" />
                            <Tooltip />
                            <Bar dataKey="value" fill="#0d6efd" radius={[2, 2, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Employee Incidents History table */}
          <div className="soc-card mt-4 shadow-sm">
            <div className="soc-card-title fw-bold mb-3">Security Incidents History</div>
            <div className="table-responsive">
              <table className="table align-middle m-0" style={{ fontSize: "13.5px" }}>
                <thead>
                  <tr className="text-muted">
                    <th>Incident ID</th>
                    <th>Title</th>
                    <th>Category</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Assigned Analyst</th>
                    <th>Analyst Level</th>
                    <th>Created Date & Time</th>
                    <th>Last Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {incidents.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="text-center py-4 text-muted">
                        No reported incidents found.
                      </td>
                    </tr>
                  ) : (
                    incidents.map(inc => (
                      <tr 
                        key={inc.id} 
                        style={{ cursor: "pointer" }} 
                        onClick={(e) => handleRowClick(e, inc.id)}
                        className="hover-row-clickable"
                      >
                        <td><strong>{formatIncidentId(inc.id)}</strong></td>
                        <td className="fw-semibold text-dark">{inc.title}</td>
                        <td><span className="badge bg-light text-dark border">{inc.category}</span></td>
                        <td>
                          <span className={`badge ${
                            inc.priority === 'Critical' ? 'bg-danger-subtle text-danger' :
                            inc.priority === 'High' ? 'bg-warning-subtle text-warning' :
                            inc.priority === 'Medium' ? 'bg-primary-subtle text-primary' : 'bg-success-subtle text-success'
                          }`}>
                            {inc.priority}
                          </span>
                        </td>
                        <td>
                          <span className="badge bg-light text-dark border">
                            {inc.status}
                          </span>
                        </td>
                        <td>{inc.assignedAnalyst}</td>
                        <td>{getAnalystLevel(inc.assignedTo, users)}</td>
                        <td><small className="text-muted">{formatTimestamp(inc.createdDate)}</small></td>
                        <td><small className="text-muted">{formatTimestamp(inc.resolvedDate || inc.createdDate)}</small></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Employee Activity Logs */}
          <div className="soc-card mt-4 shadow-sm">
            <div className="soc-card-title fw-bold mb-3">Employee Audit Activity Logs</div>
            <div className="row">
              {activities.length === 0 ? (
                <p className="text-muted text-center py-3 m-0">No recent activity logs found.</p>
              ) : (
                activities.map((act, idx) => (
                  <div key={idx} className="col-md-6 mb-3">
                    <div className="p-3 border rounded bg-light h-100">
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <span className="badge bg-secondary font-monospace text-uppercase" style={{ fontSize: "9px" }}>
                          {act.action}
                        </span>
                        <small className="text-muted">{formatTimestamp(act.timestamp)}</small>
                      </div>
                      <p className="mb-0 text-dark fw-semibold" style={{ fontSize: "13px" }}>
                        {act.remarks}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EmployeeDetails;
