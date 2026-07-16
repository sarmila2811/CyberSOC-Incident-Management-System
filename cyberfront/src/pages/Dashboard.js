import React, { useEffect, useState, useContext } from "react";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import { Link, useNavigate } from "react-router-dom";
import { 
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, 
  AreaChart, Area 
} from "recharts";
import { 
  FaBug, FaExclamationCircle, FaCheckCircle, 
  FaClock, FaShieldAlt, FaPlus, FaCalendarAlt, FaUsers, FaUserCheck, FaUserTimes, FaHourglassHalf
} from "react-icons/fa";
import { useAuth } from "../context/AuthContext";
import { NotificationContext } from "../context/NotificationContext";

function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { refreshTrigger } = useContext(NotificationContext);
  const role = user?.role?.toUpperCase();
  const currentUser = user || {};

  const [stats, setStats] = useState({
    totalIncidents: 0,
    activeIncidents: 0,
    resolvedIncidents: 0,
    openIncidents: 0,
    underInvestigation: 0,
    pendingApproval: 0,
    reopened: 0,
    escalated: 0,
    priorityBreakdown: { Critical: 0, High: 0, Medium: 0, Low: 0 },
    categoryBreakdown: {},
    analystPerformance: [],
    slaComplianceRate: 100,
    slaViolations: 0
  });

  // Admin Specific calculated stats
  const [adminStats, setAdminStats] = useState({
    totalEmployees: 0,
    totalAnalysts: 0,
    totalAdmins: 0,
    activeUsers: 0,
    inactiveUsers: 0,
    totalIncidents: 0,
    openIncidents: 0,
    resolvedIncidents: 0,
    criticalIncidents: 0,
    escalatedIncidents: 0,
    avgResolutionTime: "N/A"
  });

  const [incidents, setIncidents] = useState([]);
  // eslint-disable-next-line no-unused-vars
  const [activities, setActivities] = useState([]);
  // eslint-disable-next-line no-unused-vars
  const [notifications, setNotifications] = useState([]);
  // eslint-disable-next-line no-unused-vars
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [secondaryLoaded, setSecondaryLoaded] = useState(false);
 
  // Date Filtering States
  const [dateFilter, setDateFilter] = useState("All"); // All, Today, Week, Month, Custom
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
 
  const fetchDashboardData = async (filterType = dateFilter, start = startDate, end = endDate) => {
    try {
      setLoading(true);
      setSecondaryLoaded(false);
      
      let statsUrl = window.API_BASE_URL + "/api/reports/statistics";
      const params = [];
      if (filterType !== "All") {
        if (filterType === "Custom" && start && end) {
          params.push(`startDate=${start}`);
          params.push(`endDate=${end}`);
        } else if (filterType !== "Custom") {
          params.push(`timeRange=${filterType}`);
        }
      }
      if (role === "EMPLOYEE") {
        params.push(`reportedBy=${currentUser.username}`);
      } else if (role === "ANALYST") {
        params.push(`assignedTo=${currentUser.username}`);
      }
      if (params.length > 0) {
        statsUrl += "?" + params.join("&");
      }
 
      const headers = { "Authorization": `Bearer ${localStorage.getItem("token")}` };
 
      // Phase 1: Parallel fetch primary stats and user roster for KPI cards
      const [resStats, resUsersList] = await Promise.all([
        fetch(statsUrl, { headers }),
        fetch(window.API_BASE_URL + "/api/users", { headers })
      ]);
 
      let statsData = null;
      if (resStats.ok) {
        statsData = await resStats.json();
        setStats(statsData);
      }
 
      let usersList = [];
      if (resUsersList.ok) {
        usersList = await resUsersList.json();
        setUsers(usersList);
      }
 
      // Calculate Admin Stats
      if (role === "ADMIN" && statsData && usersList.length > 0) {
        const employeesList = usersList.filter(u => u.role && u.role.toLowerCase() === "employee");
        const analystsList = usersList.filter(u => u.role && u.role.toLowerCase() === "analyst");
        const adminsList = usersList.filter(u => u.role && u.role.toLowerCase() === "admin");
        const activeList = usersList.filter(u => u.status && u.status.toLowerCase() === "active");
        const inactiveList = usersList.filter(u => u.status && u.status.toLowerCase() === "inactive");
 
        setAdminStats({
          totalEmployees: employeesList.length,
          totalAnalysts: analystsList.length,
          totalAdmins: adminsList.length,
          activeUsers: activeList.length,
          inactiveUsers: inactiveList.length,
          totalIncidents: statsData.totalIncidents,
          openIncidents: statsData.openIncidents,
          resolvedIncidents: statsData.resolvedIncidents,
          criticalIncidents: statsData.priorityBreakdown?.Critical || 0,
          escalatedIncidents: statsData.escalated || 0,
          avgResolutionTime: statsData.avgResolutionTime || "N/A"
        });
      }
 
      // Render summary cards instantly by stopping the main skeleton loading
      setLoading(false);
 
      // Phase 2: Asynchronously fetch heavy list data and charts in parallel
      const [resInc, resAudit, resNotif] = await Promise.all([
        fetch(window.API_BASE_URL + "/api/incidents?limit=15", { headers }),
        fetch(window.API_BASE_URL + "/api/audit?limit=25", { headers }),
        currentUser.username
          ? fetch(`${window.API_BASE_URL}/api/notifications/${currentUser.username}`, { headers })
          : Promise.resolve({ ok: false })
      ]);
 
      if (resInc.ok) {
        let incData = await resInc.json();
        if (role === "EMPLOYEE") {
          incData = incData.filter(i => currentUser.username && currentUser.username.toLowerCase() === (i.reportedBy || "").toLowerCase());
        } else if (role === "ANALYST") {
          incData = incData.filter(i => currentUser.username && currentUser.username.toLowerCase() === (i.assignedTo || "").toLowerCase());
        }
        setIncidents(incData.slice(0, 5));
      }
 
      if (resAudit.ok) {
        let auditData = await resAudit.json();
        if (role === "EMPLOYEE") {
          auditData = auditData.filter(a => a.user === currentUser.username || (a.action === "INCIDENT REPORTED" && a.user === currentUser.username));
        } else if (role === "ANALYST") {
          auditData = auditData.filter(a => a.user === currentUser.username || (a.action === "INCIDENT ASSIGNED" && a.newValue === currentUser.username));
        }
        setActivities(auditData.slice(0, 6));
      }
 
      if (resNotif.ok) {
        const notifData = await resNotif.json();
        setNotifications(notifData.slice(0, 5));
      }
 
      setSecondaryLoaded(true);
 
    } catch (err) {
      console.error("Dashboard loading error:", err);
      setLoading(false);
      setSecondaryLoaded(true);
    }
  };
 
  useEffect(() => {
    if (!currentUser.username) return;
    fetchDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser.username, refreshTrigger]);

  const handleDateFilterChange = (val) => {
    setDateFilter(val);
    if (val !== "Custom") {
      fetchDashboardData(val, "", "");
    }
  };

  const handleCustomDateApply = (e) => {
    e.preventDefault();
    if (startDate && endDate) {
      fetchDashboardData("Custom", startDate, endDate);
    }
  };

  // eslint-disable-next-line no-unused-vars
  const handleActivityClick = async (act) => {
    if (act.incidentId) {
      navigate(`/incidents/${act.incidentId}`);
    } else if (act.action === "PROFILE_IMAGE_UPLOADED" || act.remarks.toLowerCase().includes("profile image")) {
      try {
        const headers = { "Authorization": `Bearer ${localStorage.getItem("token")}` };
        const res = await fetch(`${window.API_BASE_URL}/api/users/username/${act.user}`, { headers });
        if (res.ok) {
          const userData = await res.json();
          if (userData && userData.role && userData.role.toUpperCase() === "EMPLOYEE") {
            navigate(`/employees/${userData.id}`);
          } else {
            navigate("/settings");
          }
        }
      } catch (err) {
        console.error("Error navigating from activity timeline:", err);
      }
    }
  };

  // Format Recharts Data
  const priorityData = Object.keys(stats.priorityBreakdown).map(key => ({
    name: key,
    value: stats.priorityBreakdown[key]
  }));

  const PRIORITY_COLORS = {
    Critical: "#dc3545",
    High: "#fd7e14",
    Medium: "#0dcaf0",
    Low: "#198754"
  };

  const categoryData = Object.keys(stats.categoryBreakdown).map(key => ({
    category: key,
    count: stats.categoryBreakdown[key]
  }));

  // Dummy monthly trend matching current date
  const trendData = [
    { month: "Jan", count: 4 },
    { month: "Feb", count: 7 },
    { month: "Mar", count: 5 },
    { month: "Apr", count: 12 },
    { month: "May", count: 9 },
    { month: "Jun", count: 15 },
    { month: "Jul", count: incidents.length + stats.resolvedIncidents }
  ];

  const topAnalyst = (stats.analystPerformance && stats.analystPerformance.length > 0)
    ? stats.analystPerformance.reduce((prev, current) => {
        return ((prev.performanceScore || 0) > (current.performanceScore || 0)) ? prev : current;
      }, stats.analystPerformance[0])
    : null;

  return (
    <div className="app-wrapper">
      <Navbar />
      <div className="page-container">
        <Sidebar />
        <div className="main-content">
          {/* Breadcrumbs */}
          <div className="soc-breadcrumb">
            <Link to="/dashboard">Home</Link>
            <span>/</span>
            <span>Dashboard Overview</span>
          </div>

          <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
            <div className="d-flex align-items-center gap-3">
              {currentUser.profileImage ? (
                <img
                  src={`${window.API_BASE_URL}${currentUser.profileImage}`}
                  alt="Profile"
                  className="rounded-circle border border-2 border-primary"
                  style={{ width: "52px", height: "52px", objectFit: "cover" }}
                />
              ) : (
                <div 
                  className="rounded-circle bg-primary d-flex align-items-center justify-content-center text-white fw-bold border border-2 border-primary"
                  style={{ width: "52px", height: "52px", fontSize: "20px" }}
                >
                  {(currentUser.fullName || currentUser.username || "?").charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <h2 className="m-0 fw-bold">SOC Command Center</h2>
                <p className="text-muted m-0" style={{ fontSize: "13px" }}>
                  Welcome back, <strong>{currentUser.fullName || currentUser.username}</strong> ({role || "User"}).
                </p>
              </div>
            </div>
            
            {/* Professional Date Filtering Header Bar */}
            <div className="d-flex align-items-center gap-2 flex-wrap">
              <button onClick={() => { fetchDashboardData(); }} className="btn btn-outline-secondary d-flex align-items-center gap-1.5 fw-semibold py-2.5 px-3">
                Refresh
              </button>
              <div 
                className="d-flex align-items-center gap-3 bg-white border px-4 py-3.5 rounded shadow-sm animate-fade" 
                style={{ minWidth: "260px", borderRadius: "8px" }}
              >
                <FaCalendarAlt className="text-primary" style={{ fontSize: "20px" }} />
                <select 
                  className="border-0 bg-transparent fw-bold text-dark w-100" 
                  style={{ outline: "none", fontSize: "18px", cursor: "pointer" }}
                  value={dateFilter}
                  onChange={(e) => handleDateFilterChange(e.target.value)}
                >
                  <option value="All">All Time Overview</option>
                  <option value="Today">Today's Activity</option>
                  <option value="Week">Last 7 Days</option>
                  <option value="Month">Last 30 Days</option>
                  <option value="Custom">Custom Date Range</option>
                </select>
              </div>

              {dateFilter === "Custom" && (
                <form onSubmit={handleCustomDateApply} className="d-flex align-items-center gap-1.5">
                  <input
                    type="date"
                    required
                    className="soc-form-control py-2 px-2 border fw-semibold"
                    style={{ fontSize: "13px", width: "140px" }}
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                  <span className="text-muted fw-bold" style={{ fontSize: "13px" }}>to</span>
                  <input
                    type="date"
                    required
                    className="soc-form-control py-2 px-2 border fw-semibold"
                    style={{ fontSize: "13px", width: "140px" }}
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                  <button type="submit" className="btn btn-primary py-2 px-3 fw-bold">
                    Apply
                  </button>
                </form>
              )}

              <button onClick={() => fetchDashboardData()} className="btn btn-outline-secondary py-2.5 px-3.5 fw-bold shadow-sm">
                Refresh Live Feed
              </button>
              {(role === "ADMIN" || role === "EMPLOYEE") && (
                <button onClick={() => navigate("/report")} className="btn btn-soc btn-soc-primary py-2.5 px-3.5 fw-bold shadow-sm">
                  <FaPlus /> Report Incident
                </button>
              )}
            </div>
          </div>

          {loading ? (
            <div className="row g-3">
              {[1, 2, 3, 4, 5, 6].map(n => (
                <div key={n} className="col-md-4">
                  <div className="soc-card skeleton-loader" style={{ height: "120px" }}></div>
                </div>
              ))}
            </div>
          ) : (
            <>
              {/* ADMIN MODE DASHBOARD CARDS */}
              {role === "ADMIN" ? (
                <>
                  <div className="border-bottom pb-2 mb-3">
                    <h5 className="text-dark fw-bold m-0 text-uppercase" style={{ fontSize: "12px", letterSpacing: "1px" }}>
                      SOC Platform Roster & Performance Metrics
                    </h5>
                  </div>
                  <div className="row g-3 mb-4">
                    {/* Top Performing Analyst */}
                    <div className="col-md-4 col-sm-12">
                      <div 
                        className="kpi-card shadow-sm border border-light cursor-pointer hover-card bg-white p-3 rounded d-flex align-items-center gap-3" 
                        style={{ borderLeft: "4px solid #6f42c1" }}
                        onClick={() => navigate("/analyst-performance")}
                      >
                        <div className="kpi-icon-wrapper bg-purple-subtle p-2.5 rounded-circle text-purple" style={{ backgroundColor: "#e2d9f3", color: "#6f42c1" }}>
                          <span style={{ fontSize: "20px" }}>👑</span>
                        </div>
                        <div className="kpi-details">
                          <h5 className="text-muted m-0 fw-semibold" style={{ fontSize: "13px" }}>Top Performing Analyst</h5>
                          <h4 className="m-0 fw-bold text-dark" style={{ fontSize: "16px" }}>{topAnalyst ? topAnalyst.fullName : "N/A"}</h4>
                          <small className="text-muted" style={{ fontSize: "11px" }}>
                            Score: <strong style={{ color: "#6f42c1" }}>{topAnalyst ? (topAnalyst.performanceScore || 0).toFixed(2) : "0.00"}%</strong> | Rate: <strong>{topAnalyst && topAnalyst.resolutionRate !== undefined && topAnalyst.resolutionRate >= 0 ? `${topAnalyst.resolutionRate.toFixed(2)}%` : "N/A"}</strong>
                          </small>
                        </div>
                      </div>
                    </div>

                    {/* Total Employees */}
                    <div className="col-md-4 col-sm-6">
                      <div 
                        className="kpi-card shadow-sm border border-light cursor-pointer hover-card bg-white p-3 rounded d-flex align-items-center gap-3" 
                        onClick={() => navigate("/employees")}
                      >
                        <div className="kpi-icon-wrapper bg-primary-subtle p-2.5 rounded-circle text-primary">
                          <FaUsers style={{ fontSize: "20px" }} />
                        </div>
                        <div className="kpi-details">
                          <h5 className="text-muted m-0 fw-semibold" style={{ fontSize: "13px" }}>Total Employees</h5>
                          <h2 className="m-0 fw-bold text-dark" style={{ fontSize: "24px" }}>{adminStats.totalEmployees}</h2>
                        </div>
                      </div>
                    </div>

                    {/* Total Analysts */}
                    <div className="col-md-4 col-sm-6">
                      <div 
                        className="kpi-card shadow-sm border border-light cursor-pointer hover-card bg-white p-3 rounded d-flex align-items-center gap-3" 
                        onClick={() => navigate("/analyst-performance")}
                      >
                        <div className="kpi-icon-wrapper bg-warning-subtle p-2.5 rounded-circle text-warning">
                          <FaShieldAlt style={{ fontSize: "20px" }} />
                        </div>
                        <div className="kpi-details">
                          <h5 className="text-muted m-0 fw-semibold" style={{ fontSize: "13px" }}>Total Analysts</h5>
                          <h2 className="m-0 fw-bold text-dark" style={{ fontSize: "24px" }}>{adminStats.totalAnalysts}</h2>
                        </div>
                      </div>
                    </div>

                    {/* Active Users */}
                    <div className="col-md-6 col-sm-6">
                      <div 
                        className="kpi-card shadow-sm border border-light cursor-pointer hover-card bg-white p-3 rounded d-flex align-items-center gap-3" 
                        onClick={() => navigate("/users", { state: { status: "ACTIVE" } })}
                      >
                        <div className="kpi-icon-wrapper bg-success-subtle p-2.5 rounded-circle text-success">
                          <FaUserCheck style={{ fontSize: "20px" }} />
                        </div>
                        <div className="kpi-details">
                          <h5 className="text-muted m-0 fw-semibold" style={{ fontSize: "13px" }}>Active Roster Accounts</h5>
                          <h2 className="m-0 fw-bold text-dark" style={{ fontSize: "24px" }}>{adminStats.activeUsers}</h2>
                        </div>
                      </div>
                    </div>

                    {/* Inactive Users */}
                    <div className="col-md-6 col-sm-6">
                      <div 
                        className="kpi-card shadow-sm border border-light cursor-pointer hover-card bg-white p-3 rounded d-flex align-items-center gap-3" 
                        onClick={() => navigate("/users", { state: { status: "INACTIVE" } })}
                      >
                        <div className="kpi-icon-wrapper bg-secondary-subtle p-2.5 rounded-circle text-secondary">
                          <FaUserTimes style={{ fontSize: "20px" }} />
                        </div>
                        <div className="kpi-details">
                          <h5 className="text-muted m-0 fw-semibold" style={{ fontSize: "13px" }}>Inactive Accounts</h5>
                          <h2 className="m-0 fw-bold text-dark" style={{ fontSize: "24px" }}>{adminStats.inactiveUsers}</h2>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="border-bottom pb-2 mb-3">
                    <h5 className="text-dark fw-bold m-0 text-uppercase" style={{ fontSize: "12px", letterSpacing: "1px" }}>
                      SOC Incident Telemetry Metrics
                    </h5>
                  </div>
                  <div className="row g-3 mb-4">
                    {/* Total Incidents */}
                    <div className="col-md-3 col-sm-6">
                      <div 
                        className="kpi-card shadow-sm border border-light cursor-pointer hover-card bg-white p-3 rounded d-flex align-items-center gap-3" 
                        onClick={() => navigate("/incidents")}
                      >
                        <div className="kpi-icon-wrapper bg-primary-subtle p-2.5 rounded-circle text-primary">
                          <FaShieldAlt style={{ fontSize: "20px" }} />
                        </div>
                        <div className="kpi-details">
                          <h5 className="text-muted m-0 fw-semibold" style={{ fontSize: "13px" }}>Total Incidents</h5>
                          <h2 className="m-0 fw-bold text-dark" style={{ fontSize: "24px" }}>{stats.totalIncidents || 0}</h2>
                          <small className="text-danger fw-semibold" style={{ fontSize: "10.5px" }}>{stats.criticalCount || 0} Critical</small>
                        </div>
                      </div>
                    </div>

                    {/* Pending Assignment */}
                    <div className="col-md-3 col-sm-6">
                      <div 
                        className="kpi-card shadow-sm border border-light cursor-pointer hover-card bg-white p-3 rounded d-flex align-items-center gap-3" 
                        onClick={() => navigate("/incidents?status=PENDING_ASSIGNMENT")}
                      >
                        <div className="kpi-icon-wrapper bg-danger-subtle p-2.5 rounded-circle text-danger">
                          <FaClock style={{ fontSize: "20px" }} />
                        </div>
                        <div className="kpi-details">
                          <h5 className="text-muted m-0 fw-semibold" style={{ fontSize: "13px" }}>Pending Assignment</h5>
                          <h2 className="m-0 fw-bold text-dark" style={{ fontSize: "24px" }}>{stats.pendingAssignment || 0}</h2>
                        </div>
                      </div>
                    </div>

                    {/* Under Investigation */}
                    <div className="col-md-3 col-sm-6">
                      <div 
                        className="kpi-card shadow-sm border border-light cursor-pointer hover-card bg-white p-3 rounded d-flex align-items-center gap-3" 
                        onClick={() => navigate("/incidents?status=UNDER_INVESTIGATION")}
                      >
                        <div className="kpi-icon-wrapper bg-warning-subtle p-2.5 rounded-circle text-warning">
                          <FaShieldAlt style={{ fontSize: "20px" }} />
                        </div>
                        <div className="kpi-details">
                          <h5 className="text-muted m-0 fw-semibold" style={{ fontSize: "13px" }}>Under Investigation</h5>
                          <h2 className="m-0 fw-bold text-dark" style={{ fontSize: "24px" }}>{stats.underInvestigation || 0}</h2>
                        </div>
                      </div>
                    </div>

                    {/* Escalated */}
                    <div className="col-md-3 col-sm-6">
                      <div 
                        className="kpi-card shadow-sm border border-light cursor-pointer hover-card bg-white p-3 rounded d-flex align-items-center gap-3" 
                        onClick={() => navigate("/incidents?status=ESCALATED")}
                      >
                        <div className="kpi-icon-wrapper bg-danger-subtle p-2.5 rounded-circle text-danger">
                          <FaExclamationCircle style={{ fontSize: "20px" }} />
                        </div>
                        <div className="kpi-details">
                          <h5 className="text-muted m-0 fw-semibold" style={{ fontSize: "13px" }}>Escalated</h5>
                          <h2 className="m-0 fw-bold text-dark" style={{ fontSize: "24px" }}>{stats.escalated || 0}</h2>
                          <small className="text-muted" style={{ fontSize: "10.5px" }}>L1: {stats.incidentsAtL1 || 0} | L2: {stats.incidentsAtL2 || 0} | L3: {stats.incidentsAtL3 || 0}</small>
                        </div>
                      </div>
                    </div>

                    {/* Management Review */}
                    <div className="col-md-4 col-sm-6">
                      <div 
                        className="kpi-card shadow-sm border border-light cursor-pointer hover-card bg-white p-3 rounded d-flex align-items-center gap-3" 
                        onClick={() => navigate("/incidents?status=MANAGEMENT_REVIEW")}
                      >
                        <div className="kpi-icon-wrapper bg-primary-subtle p-2.5 rounded-circle text-primary">
                          <FaBug style={{ fontSize: "20px" }} />
                        </div>
                        <div className="kpi-details">
                          <h5 className="text-muted m-0 fw-semibold" style={{ fontSize: "13px" }}>Management Review</h5>
                          <h2 className="m-0 fw-bold text-dark" style={{ fontSize: "24px" }}>{stats.managementReview || 0}</h2>
                        </div>
                      </div>
                    </div>

                    {/* Pending Admin Approval */}
                    <div className="col-md-4 col-sm-6">
                      <div 
                        className="kpi-card shadow-sm border border-light cursor-pointer hover-card bg-white p-3 rounded d-flex align-items-center gap-3" 
                        onClick={() => navigate("/incidents?status=PENDING_ADMIN_APPROVAL")}
                      >
                        <div className="kpi-icon-wrapper bg-info-subtle p-2.5 rounded-circle text-info">
                          <FaClock style={{ fontSize: "20px" }} />
                        </div>
                        <div className="kpi-details">
                          <h5 className="text-muted m-0 fw-semibold" style={{ fontSize: "13px" }}>Pending Admin Approval</h5>
                          <h2 className="m-0 fw-bold text-dark" style={{ fontSize: "24px" }}>{stats.pendingApproval || 0}</h2>
                        </div>
                      </div>
                    </div>

                    {/* Closed */}
                    <div className="col-md-4 col-sm-6">
                      <div 
                        className="kpi-card shadow-sm border border-light cursor-pointer hover-card bg-white p-3 rounded d-flex align-items-center gap-3" 
                        onClick={() => navigate("/resolved-incidents")}
                      >
                        <div className="kpi-icon-wrapper bg-success-subtle p-2.5 rounded-circle text-success">
                          <FaCheckCircle style={{ fontSize: "20px" }} />
                        </div>
                        <div className="kpi-details">
                          <h5 className="text-muted m-0 fw-semibold" style={{ fontSize: "13px" }}>Closed</h5>
                          <h2 className="m-0 fw-bold text-dark" style={{ fontSize: "24px" }}>{stats.resolvedIncidents || 0}</h2>
                        </div>
                      </div>
                    </div>

                    {/* AI Routing Confidence */}
                    <div className="col-md-4 col-sm-6">
                      <div 
                        className="kpi-card shadow-sm border border-light cursor-pointer hover-card bg-white p-3 rounded d-flex align-items-center gap-3" 
                      >
                        <div className="kpi-icon-wrapper bg-purple-subtle p-2.5 rounded-circle text-purple" style={{ backgroundColor: "#e2d9f3", color: "#6f42c1" }}>
                          <FaUserCheck style={{ fontSize: "20px" }} />
                        </div>
                        <div className="kpi-details">
                          <h5 className="text-muted m-0 fw-semibold" style={{ fontSize: "13px" }}>Avg AI Routing Confidence</h5>
                          <h2 className="m-0 fw-bold text-dark" style={{ fontSize: "24px" }}>{stats.avgRoutingConfidence !== undefined ? stats.avgRoutingConfidence : 78.5}%</h2>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              ) : role === "ANALYST" ? (
                /* ANALYST SPECIFIC SUMMARY CARDS */
                <div className="row g-3 mb-4">
                  {/* Total Incidents */}
                  <div className="col-md-3 col-sm-6 flex-fill">
                    <div 
                      className="kpi-card shadow-sm border border-light cursor-pointer hover-card bg-white p-3 rounded d-flex align-items-center gap-3" 
                      onClick={() => navigate("/incidents")}
                    >
                      <div className="kpi-icon-wrapper bg-primary-subtle p-2.5 rounded-circle text-primary">
                        <FaShieldAlt style={{ fontSize: "20px" }} />
                      </div>
                      <div className="kpi-details">
                        <h5 className="text-muted m-0 fw-semibold" style={{ fontSize: "13px" }}>Total Incidents</h5>
                        <h2 className="m-0 fw-bold text-dark" style={{ fontSize: "24px" }}>{stats.totalIncidents || 0}</h2>
                        <small className="text-danger fw-semibold" style={{ fontSize: "10.5px" }}>{stats.criticalCount || 0} Critical</small>
                      </div>
                    </div>
                  </div>

                  {/* My Assigned Incidents */}
                  <div className="col-md-3 col-sm-6 flex-fill">
                    <div 
                      className="kpi-card shadow-sm border border-light cursor-pointer hover-card bg-white p-3 rounded d-flex align-items-center gap-3" 
                      onClick={() => navigate("/incidents?filter=active")}
                    >
                      <div className="kpi-icon-wrapper bg-primary-subtle p-2.5 rounded-circle text-primary">
                        <FaBug style={{ fontSize: "20px" }} />
                      </div>
                      <div className="kpi-details">
                        <h5 className="text-muted m-0 fw-semibold" style={{ fontSize: "13px" }}>My Assigned Incidents</h5>
                        <h2 className="m-0 fw-bold text-dark" style={{ fontSize: "24px" }}>{stats.activeIncidents || 0}</h2>
                      </div>
                    </div>
                  </div>

                  {/* Escalated Incidents */}
                  <div className="col-md-3 col-sm-6 flex-fill">
                    <div 
                      className="kpi-card shadow-sm border border-light cursor-pointer hover-card bg-white p-3 rounded d-flex align-items-center gap-3" 
                      onClick={() => navigate("/incidents?status=ESCALATED")}
                    >
                      <div className="kpi-icon-wrapper bg-danger-subtle p-2.5 rounded-circle text-danger">
                        <FaExclamationCircle style={{ fontSize: "20px" }} />
                      </div>
                      <div className="kpi-details">
                        <h5 className="text-muted m-0 fw-semibold" style={{ fontSize: "13px" }}>Escalated Incidents</h5>
                        <h2 className="m-0 fw-bold text-dark" style={{ fontSize: "24px" }}>{stats.escalated || 0}</h2>
                        <small className="text-muted" style={{ fontSize: "10.5px" }}>L1: {stats.incidentsAtL1 || 0} | L2: {stats.incidentsAtL2 || 0} | L3: {stats.incidentsAtL3 || 0}</small>
                      </div>
                    </div>
                  </div>

                  {/* Pending Approval */}
                  <div className="col-md-3 col-sm-6 flex-fill">
                    <div 
                      className="kpi-card shadow-sm border border-light cursor-pointer hover-card bg-white p-3 rounded d-flex align-items-center gap-3" 
                      onClick={() => navigate("/incidents?status=PENDING_ADMIN_APPROVAL")}
                    >
                      <div className="kpi-icon-wrapper bg-info-subtle p-2.5 rounded-circle text-info">
                        <FaClock style={{ fontSize: "20px" }} />
                      </div>
                      <div className="kpi-details">
                        <h5 className="text-muted m-0 fw-semibold" style={{ fontSize: "13px" }}>Pending Approval</h5>
                        <h2 className="m-0 fw-bold text-dark" style={{ fontSize: "24px" }}>{stats.pendingApproval || 0}</h2>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* EMPLOYEE SPECIFIC SUMMARY CARDS */
                <div className="row g-3 mb-4">
                  {/* Total Incidents */}
                  <div className="col-md-3 col-sm-6 flex-fill">
                    <div 
                      className="kpi-card shadow-sm border border-light cursor-pointer hover-card bg-white p-3 rounded d-flex align-items-center gap-3" 
                      onClick={() => navigate("/incidents")}
                    >
                      <div className="kpi-icon-wrapper bg-primary-subtle p-2.5 rounded-circle text-primary">
                        <FaShieldAlt style={{ fontSize: "20px" }} />
                      </div>
                      <div className="kpi-details">
                        <h5 className="text-muted m-0 fw-semibold" style={{ fontSize: "13px" }}>Total Incidents</h5>
                        <h2 className="m-0 fw-bold text-dark" style={{ fontSize: "24px" }}>{stats.totalIncidents || 0}</h2>
                      </div>
                    </div>
                  </div>

                  {/* Pending Assignment */}
                  <div className="col-md-3 col-sm-6">
                    <div 
                      className="kpi-card shadow-sm border border-light cursor-pointer hover-card bg-white p-3 rounded d-flex align-items-center gap-3" 
                      onClick={() => navigate("/incidents?status=PENDING_ASSIGNMENT")}
                    >
                      <div className="kpi-icon-wrapper bg-info-subtle p-2.5 rounded-circle text-info">
                        <FaClock style={{ fontSize: "20px" }} />
                      </div>
                      <div className="kpi-details">
                        <h5 className="text-muted m-0 fw-semibold" style={{ fontSize: "13px" }}>Pending Assignment</h5>
                        <h2 className="m-0 fw-bold text-dark" style={{ fontSize: "24px" }}>{stats.pendingAssignment || 0}</h2>
                      </div>
                    </div>
                  </div>

                  {/* Under Investigation */}
                  <div className="col-md-3 col-sm-6">
                    <div 
                      className="kpi-card shadow-sm border border-light cursor-pointer hover-card bg-white p-3 rounded d-flex align-items-center gap-3" 
                      onClick={() => navigate("/incidents?status=UNDER_INVESTIGATION")}
                    >
                      <div className="kpi-icon-wrapper bg-warning-subtle p-2.5 rounded-circle text-warning">
                        <FaShieldAlt style={{ fontSize: "20px" }} />
                      </div>
                      <div className="kpi-details">
                        <h5 className="text-muted m-0 fw-semibold" style={{ fontSize: "13px" }}>Under Investigation</h5>
                        <h2 className="m-0 fw-bold text-dark" style={{ fontSize: "24px" }}>{(stats.underInvestigation || 0) + (stats.reopened || 0)}</h2>
                      </div>
                    </div>
                  </div>

                  {/* Escalated */}
                  <div className="col-md-3 col-sm-6">
                    <div 
                      className="kpi-card shadow-sm border border-light cursor-pointer hover-card bg-white p-3 rounded d-flex align-items-center gap-3" 
                      onClick={() => navigate("/incidents?status=ESCALATED")}
                    >
                      <div className="kpi-icon-wrapper bg-danger-subtle p-2.5 rounded-circle text-danger">
                        <FaExclamationCircle style={{ fontSize: "20px" }} />
                      </div>
                      <div className="kpi-details">
                        <h5 className="text-muted m-0 fw-semibold" style={{ fontSize: "13px" }}>Escalated</h5>
                        <h2 className="m-0 fw-bold text-dark" style={{ fontSize: "24px" }}>{stats.escalated || 0}</h2>
                      </div>
                    </div>
                  </div>

                  {/* Closed */}
                  <div className="col-md-3 col-sm-6">
                    <div 
                      className="kpi-card shadow-sm border border-light cursor-pointer hover-card bg-white p-3 rounded d-flex align-items-center gap-3" 
                      onClick={() => navigate("/resolved-incidents")}
                    >
                      <div className="kpi-icon-wrapper bg-success-subtle p-2.5 rounded-circle text-success">
                        <FaCheckCircle style={{ fontSize: "20px" }} />
                      </div>
                      <div className="kpi-details">
                        <h5 className="text-muted m-0 fw-semibold" style={{ fontSize: "13px" }}>Closed</h5>
                        <h2 className="m-0 fw-bold text-dark" style={{ fontSize: "24px" }}>{stats.resolvedIncidents || 0}</h2>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Charts Panel & Lists (Lazy Loaded Asynchronously) */}
              {!secondaryLoaded ? (
                <div className="row g-4 mb-4">
                  <div className="col-md-8">
                    <div className="soc-card skeleton-loader d-flex align-items-center justify-content-center" style={{ height: "320px" }}>
                      <div className="text-muted text-center">
                        <FaHourglassHalf className="fa-spin mb-2" style={{ fontSize: "24px" }} />
                        <p className="m-0 fw-semibold">Loading Threat Metrics & Analytics...</p>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="soc-card skeleton-loader d-flex align-items-center justify-content-center" style={{ height: "320px" }}>
                      <div className="text-muted text-center">
                        <FaHourglassHalf className="fa-spin mb-2" style={{ fontSize: "24px" }} />
                        <p className="m-0 fw-semibold">Loading Live Activity Feed...</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {/* Charts Panel */}
                  <div className="row g-4 mb-4">
                    {/* Priority Pie */}
                    <div className="col-lg-4 col-md-12">
                      <div className="soc-card h-100 shadow-sm">
                        <div className="soc-card-title fw-bold mb-3">Priority Breakdown</div>
                        <div style={{ height: "280px", width: "100%" }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={priorityData.filter(d => d.value > 0)}
                                cx="50%"
                                cy="50%"
                                innerRadius={55}
                                outerRadius={75}
                                paddingAngle={4}
                                dataKey="value"
                                style={{ cursor: "pointer" }}
                                onClick={(data) => {
                                  if (data && data.name) {
                                    navigate("/incidents", { state: { priority: data.name } });
                                  }
                                }}
                              >
                                {priorityData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={PRIORITY_COLORS[entry.name] || "#8884d8"} />
                                ))}
                              </Pie>
                              <Tooltip formatter={(value) => [`${value} Incidents`, "Volume"]} />
                              <Legend verticalAlign="bottom" height={36} />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>

                    {/* Monthly trends */}
                    <div className="col-lg-5 col-md-12">
                      <div className="soc-card h-100 shadow-sm">
                        <div className="soc-card-title fw-bold mb-3">Incident Flow Trend</div>
                        <div style={{ height: "280px", width: "100%" }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart 
                              data={trendData}
                              style={{ cursor: "pointer" }}
                              onClick={() => navigate("/incidents", { state: {} })}
                            >
                              <defs>
                                <linearGradient id="colorFlow" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#0d6efd" stopOpacity={0.2}/>
                                  <stop offset="95%" stopColor="#0d6efd" stopOpacity={0}/>
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                              <XAxis dataKey="month" stroke="#94a3b8" />
                              <YAxis stroke="#94a3b8" />
                              <Tooltip />
                              <Area type="monotone" dataKey="count" stroke="#0d6efd" strokeWidth={2.5} fillOpacity={1} fill="url(#colorFlow)" />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>

                    {/* Threat score */}
                    <div className="col-lg-3 col-md-12">
                      <div className="soc-card h-100 threat-score-radial bg-primary text-white shadow-sm d-flex flex-column justify-content-center align-items-center text-center p-4 rounded">
                        <h5 className="text-white opacity-75 mb-1" style={{ fontSize: "14px" }}>Threat Score</h5>
                        <div style={{ fontSize: "64px", fontWeight: "800", letterSpacing: "-2px" }}>
                          {Math.min(100, Math.max(0, stats.openIncidents * 10 + stats.escalated * 15))}
                        </div>
                        <span className="badge bg-white text-primary px-3 py-1 rounded-pill mb-3 fw-bold" style={{ fontSize: "11px" }}>
                          {stats.escalated > 0 ? "CRITICAL ALERT" : "STABLE"}
                        </span>
                        <small className="opacity-75" style={{ fontSize: "11px" }}>
                          Based on active, unassigned, and escalated incidents.
                        </small>
                      </div>
                    </div>
                  </div>

                  {/* Specialization Breakdown Chart */}
                  <div className="row g-4 mb-4">
                    <div className="col-md-12">
                      <div className="soc-card shadow-sm">
                        <div className="soc-card-title fw-bold mb-3">Threat Categories Distribution</div>
                        <div style={{ height: "280px", width: "100%" }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={categoryData}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                              <XAxis dataKey="category" stroke="#94a3b8" />
                              <YAxis stroke="#94a3b8" />
                              <Tooltip />
                              <Bar 
                                dataKey="count" 
                                fill="#0d6efd" 
                                radius={[4, 4, 0, 0]} 
                                barSize={40}
                                style={{ cursor: "pointer" }}
                                onClick={(data) => {
                                  if (data && data.category) {
                                    navigate("/incidents", { state: { category: data.category } });
                                  }
                                }}
                              />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Data Lists */}
                  {role !== "EMPLOYEE" && (
                    <div className="row g-4 mb-4">
                      {/* Analyst Workload Distribution */}
                      <div className="col-md-12">
                        <div className="soc-card shadow-sm h-100">
                          <div className="soc-card-title fw-bold mb-3">Analyst Workload Distribution</div>
                          <div className="row g-3">
                            {stats.analystPerformance.length === 0 ? (
                              <p className="text-muted text-center m-0 py-3 w-100">No analyst accounts found.</p>
                            ) : (
                              stats.analystPerformance.map((perf, i) => (
                                <div key={i} className="col-md-6 col-lg-4">
                                  <div className="d-flex align-items-center justify-content-between p-3 rounded border bg-light h-100 hover-card shadow-sm">
                                    <div>
                                      <strong className="text-dark d-block" style={{ fontSize: "14px" }}>{perf.fullName}</strong>
                                      <small className="text-muted text-uppercase" style={{ fontSize: "11px" }}>
                                        {perf.specialization || "Generalist"} ({perf.level} Analyst)
                                      </small>
                                    </div>
                                    <div className="text-end">
                                      <span className="badge bg-primary text-white d-block mb-1" style={{ fontSize: "11px" }}>
                                        {perf.activeCount} Active
                                      </span>
                                      <small className="text-success fw-semibold" style={{ fontSize: "11px" }}>
                                        {perf.resolvedCount} Resolved
                                      </small>
                                    </div>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;