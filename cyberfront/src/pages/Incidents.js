import React, { useEffect, useState, useContext } from "react";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import { Link, useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { FaSearch, FaFilter, FaDownload, FaTrash, FaCheck, FaTimes, FaArrowUp, FaUserPlus, FaEye } from "react-icons/fa";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatIncidentId, formatTimestamp, getAnalystLevel, formatSpecialization } from "../utils/format";
import { NotificationContext } from "../context/NotificationContext";

export const doesSpecializationMatch = (category, specialization) => {
  if (!category || !specialization) return false;
  const cat = category.toUpperCase().trim();
  const spec = specialization.toUpperCase().trim();
  
  if (cat === spec) return true;
  
  switch (cat) {
    case "MALWARE":
      return spec === "MALWARE";
    case "PHISHING":
      return spec === "PHISHING";
    case "RANSOMWARE":
      return spec === "RANSOMWARE";
    case "WEB_SECURITY":
    case "WEB_ATTACK":
      return spec === "WEB SECURITY" || spec === "WEB ATTACK";
    case "DATA_BREACH":
      return spec === "DATA SECURITY" || spec === "DATA BREACH";
    case "NETWORK":
    case "NETWORK_SECURITY":
      return spec === "NETWORK SECURITY" || spec === "NETWORK";
    case "EMAIL_SECURITY":
      return spec === "EMAIL SECURITY";
    case "IDENTITY_ACCESS":
      return spec === "IDENTITY & ACCESS" || spec === "IDENTITY AND ACCESS" || spec === "IDENTITY_ACCESS";
    case "ENDPOINT_SECURITY":
      return spec === "ENDPOINT SECURITY";
    default:
      return false;
  }
};

function Incidents() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const filterParam = searchParams.get("filter");
  const [incidents, setIncidents] = useState([]);
  const { refreshTrigger } = useContext(NotificationContext);
  const [analysts, setAnalysts] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assignModalIncident, setAssignModalIncident] = useState(null);
  const [aiRec, setAiRec] = useState(null);
  const [loadingAiRec, setLoadingAiRec] = useState(false);

  useEffect(() => {
    if (assignModalIncident) {
      const fetchAiRec = async () => {
        try {
          setLoadingAiRec(true);
          const headers = { "Authorization": `Bearer ${localStorage.getItem("token")}` };
          const res = await fetch(`${window.API_BASE_URL}/api/incidents/${assignModalIncident.id}/recommend-analyst`, { headers });
          if (res.ok) {
            const data = await res.json();
            setAiRec(data);
          } else {
            setAiRec(null);
          }
        } catch (err) {
          console.error("Failed to fetch AI recommendation:", err);
          setAiRec(null);
        } finally {
          setLoadingAiRec(false);
        }
      };
      fetchAiRec();
    } else {
      setAiRec(null);
    }
  }, [assignModalIncident]);

  const location = useLocation();

  // Filters State
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [assigneeFilter, setAssigneeFilter] = useState("");
  const [timeFilter, setTimeFilter] = useState(""); // Today, Week, Month, Year

  useEffect(() => {
    const statusParam = searchParams.get("status");
    const priorityParam = searchParams.get("priority") || location.state?.priority;
    const categoryParam = searchParams.get("category") || location.state?.category;
    const searchParam = searchParams.get("search");

    if (statusParam) {
      const up = statusParam.toUpperCase();
      if (up === "ALL") setStatusFilter("ALL");
      else if (up === "OPEN") setStatusFilter("OPEN");
      else if (up === "RESOLVED" || up === "CLOSED") setStatusFilter("Closed");
      else if (up === "UNDER_INVESTIGATION") setStatusFilter("UNDER_INVESTIGATION");
      else if (up === "ESCALATED") setStatusFilter("ESCALATED");
      else if (up === "PENDING_ASSIGNMENT") setStatusFilter("PENDING_ASSIGNMENT");
      else if (up === "MANAGEMENT_REVIEW") setStatusFilter("MANAGEMENT_REVIEW");
      else if (up === "PENDING_ADMIN_APPROVAL" || up === "PENDING" || up === "PENDING_APPROVAL") setStatusFilter("PENDING_ADMIN_APPROVAL");
      else if (up === "REOPENED") setStatusFilter("REOPENED");
      else setStatusFilter(statusParam);
    } else {
      setStatusFilter("");
    }

    if (priorityParam) {
      const up = priorityParam.toUpperCase();
      if (up === "CRITICAL") setPriorityFilter("Critical");
      else if (up === "HIGH") setPriorityFilter("High");
      else if (up === "MEDIUM") setPriorityFilter("Medium");
      else if (up === "LOW") setPriorityFilter("Low");
      else setPriorityFilter(priorityParam);
    } else {
      setPriorityFilter("");
    }

    if (categoryParam) {
      setCategoryFilter(categoryParam);
    } else {
      setCategoryFilter("");
    }

    if (searchParam) {
      setSearch(searchParam);
    } else {
      setSearch("");
    }
  }, [searchParams, location.state]);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const currentUser = JSON.parse(localStorage.getItem("currentUser") || "{}");
  const role = currentUser?.role?.toUpperCase();
  const username = currentUser?.username;

  const getSlaStatus = (inc) => {
    if (inc.slaStatus) {
      if (inc.slaStatus === "Met") {
        return <span className="badge bg-success-subtle text-success border">Met</span>;
      }
      if (inc.slaStatus === "Breached") {
        return <span className="badge bg-danger-subtle text-danger border">Breached</span>;
      }
      if (inc.slaStatus === "Active") {
        return <span className="badge bg-primary-subtle text-primary border">Active</span>;
      }
      if (inc.slaStatus === "No SLA") {
        return <span className="badge bg-light text-dark border">No SLA</span>;
      }
    }
    if (inc.status === "Closed" || inc.status === "Resolved") {
      return <span className="badge bg-success-subtle text-success border">Met</span>;
    }
    if (!inc.slaDeadline) {
      return <span className="badge bg-light text-dark border">No SLA</span>;
    }
    const now = new Date();
    const deadline = new Date(inc.slaDeadline);
    if (deadline - now <= 0) {
      return <span className="badge bg-danger-subtle text-danger border">Breached</span>;
    }
    return <span className="badge bg-primary-subtle text-primary border">Active</span>;
  };

  const getAnalystSpecialization = (username, list) => {
    if (!username || !list || list.length === 0) return "";
    const found = list.find(u => u.username && u.username.toLowerCase() === username.toLowerCase());
    return found && found.specialization ? found.specialization : "";
  };

  const fetchIncidents = async () => {
    try {
      setLoading(true);
      const headers = { "Authorization": `Bearer ${localStorage.getItem("token")}` };
      
      const filterParam = searchParams.get("filter");
      let incidentsUrl = window.API_BASE_URL + "/api/incidents";
      if (filterParam === "active") {
        incidentsUrl = window.API_BASE_URL + "/api/incidents/active";
      } else if (role === "ANALYST" && username) {
        incidentsUrl = `${window.API_BASE_URL}/api/incidents/my-incidents/${username}`;
      } else if (role === "EMPLOYEE" && username) {
        incidentsUrl = `${window.API_BASE_URL}/api/incidents/user/${username}`;
      }

      const [resActive, resUsers] = await Promise.all([
        fetch(incidentsUrl, { headers }),
        fetch(window.API_BASE_URL + "/api/users", { headers })
      ]);

      let activeData = [];
      if (resActive.ok) {
        const rawActive = await resActive.json();
        const seenIds = new Set();
        for (const item of rawActive) {
          if (item && item.id && !seenIds.has(item.id)) {
            seenIds.add(item.id);
            activeData.push(item);
          }
        }
      }

      let finalData = activeData;
      if (filterParam === "active") {
        const activeStatuses = ["OPEN", "UNDER_INVESTIGATION", "ESCALATED"];
        finalData = activeData.filter(inc => activeStatuses.includes((inc.status || "").toUpperCase()));
      }

      setIncidents(finalData);

      if (resUsers.ok) {
        const users = await resUsers.json();
        setUsersList(users);
        setAnalysts(users.filter(u => u.role && u.role.toLowerCase() === "analyst"));
      }
    } catch (err) {
      console.error("Fetch incidents error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, [refreshTrigger, searchParams]);

  // Quick Action: Delete Incident
  const handleDeleteIncident = async (id) => {
    if (!window.confirm("Are you sure you want to delete incident " + formatIncidentId(id) + "?")) return;
    try {
      const res = await fetch(`${window.API_BASE_URL}/api/incidents/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
      });
      if (res.ok) {
        fetchIncidents();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Quick Action: Manual Escalate
  const handleEscalateIncident = async (id) => {
    if (!window.confirm("Do you want to escalate incident " + formatIncidentId(id) + " to L2?")) return;
    try {
      const res = await fetch(`${window.API_BASE_URL}/api/incidents/${id}/escalate`, {
        method: "PUT",
        headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
      });
      if (res.ok) {
        fetchIncidents();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Quick Action: Assign Analyst
  const handleAssignAnalyst = async (incidentId, targetUsername) => {
    try {
      const selected = analysts.find(a => a.username === targetUsername);
      const payload = {
        assignedTo: targetUsername,
        assignedAnalystName: selected ? selected.fullName : ""
      };
      const res = await fetch(`${window.API_BASE_URL}/api/incidents/${incidentId}/assign`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        fetchIncidents();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Filter Logic
  const filteredIncidents = incidents.filter(inc => {
    // Exclude non-active incidents from active list only if filterParam === "active"
    const filterParam = searchParams.get("filter");
    if (filterParam === "active") {
      const activeStatuses = ["OPEN", "UNDER_INVESTIGATION", "ESCALATED"];
      if (!activeStatuses.includes((inc.status || "").toUpperCase())) {
        return false;
      }
    }

    // If employee, filter to only show their incidents
    if (role === "EMPLOYEE" && username && (inc.reportedBy || "").toLowerCase() !== username.toLowerCase()) {
      return false;
    }

    // If analyst, only show incidents matching specialization OR manually assigned to them
    if (role === "ANALYST") {
      const isAssignedToMe = (inc.assignedTo || "").toLowerCase().trim() === (username || "").toLowerCase().trim();
      const isSpecializationMatch = doesSpecializationMatch(inc.category, currentUser.specialization);
      if (!isAssignedToMe && !isSpecializationMatch) {
        return false;
      }
    }

    const matchSearch = !search || 
      (inc.title || "").toLowerCase().includes(search.toLowerCase()) ||
      (inc.description || "").toLowerCase().includes(search.toLowerCase()) ||
      String(inc.id).includes(search);

    const matchPriority = !priorityFilter || inc.priority === priorityFilter;
    let matchStatus = true;
    if (statusFilter && statusFilter !== "ALL") {
      const s = (inc.status || "").toUpperCase();
      const f = statusFilter.toUpperCase();
      if (f === "PENDING_ADMIN_APPROVAL" || f === "PENDING_APPROVAL" || f === "PENDING") {
        matchStatus = (s === "PENDING_APPROVAL" || s === "PENDING_ADMIN_APPROVAL" || s === "PENDING");
      } else if (f === "CLOSED" || f === "RESOLVED") {
        matchStatus = (s === "CLOSED" || s === "RESOLVED");
      } else {
        matchStatus = (s === f);
      }
    }
    const matchCategory = !categoryFilter || inc.category === categoryFilter;
    const matchAssignee = !assigneeFilter || inc.assignedTo === assigneeFilter;

    // Time filtering logic
    let matchTime = true;
    if (timeFilter) {
      const incDate = new Date(inc.timestamp);
      const now = new Date();
      if (timeFilter === "Today") {
        matchTime = incDate.toDateString() === now.toDateString();
      } else if (timeFilter === "Week") {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(now.getDate() - 7);
        matchTime = incDate >= oneWeekAgo;
      } else if (timeFilter === "Month") {
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(now.getMonth() - 1);
        matchTime = incDate >= oneMonthAgo;
      }
    }

    return matchSearch && matchPriority && matchStatus && matchCategory && matchAssignee && matchTime;
  });

  // Pagination Logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredIncidents.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredIncidents.length / itemsPerPage);

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  // Export CSV Report
  const exportCSV = () => {
    const csvHeaders = ["Incident ID", "Title", "Category", "Priority", "Status", "Reporter", "Assigned Analyst", "Level", "Created Time", "Resolved Time", "AI Risk Level", "AI Recommended Priority", "Current Priority"];
    const rows = filteredIncidents.map(inc => [
      formatIncidentId(inc.id),
      `"${(inc.title || "").replace(/"/g, '""')}"`,
      formatSpecialization(inc.category) || "—",
      inc.priority || "—",
      inc.status || "—",
      inc.reportedBy || "—",
      inc.assignedAnalystName || "Unassigned",
      getAnalystLevel(inc.assignedTo, usersList) || "—",
      formatTimestamp(inc.timestamp),
      inc.approvedTime ? formatTimestamp(inc.approvedTime) : "—",
      inc.aiAssistantRiskLevel || "—",
      inc.recommendedPriority || "—",
      inc.priority || "—"
    ]);

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + [csvHeaders.join(","), ...rows.map(r => r.join(","))].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `cybersoc_incidents_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export PDF Report
  const exportPDF = () => {
    const doc = new jsPDF("landscape");
    const currentUser = JSON.parse(localStorage.getItem("currentUser") || "{}");
    const currentUsername = currentUser?.username || "Admin";
    
    // Header Style
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(13, 110, 253);
    doc.text("CyberSOC Operations Console", 14, 20);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text("Active Incident Roster Telemetry Log", 14, 26);
    doc.text(`Generated: ${new Date().toLocaleString()} | User: ${currentUsername}`, 14, 32);
    
    doc.setDrawColor(226, 232, 240);
    doc.line(14, 35, 283, 35);
    
    // Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(30, 41, 59);
    doc.text("Incident Registry Telemetry Log", 14, 45);

    const tableColumn = [
      "Incident ID", "Title", "Category", "Priority", "Status", 
      "Reporter", "Assigned Analyst", "Analyst Level", "Created Time", 
      "Last Updated", "Resolved Time", "SLA Status", "Current Workflow Stage",
      "AI Risk Level", "AI Recommended Priority", "Current Priority"
    ];
    
    const tableRows = filteredIncidents.map(inc => {
      const getSlaText = (i) => {
        if (i.slaStatus) return i.slaStatus;
        if (i.status === "Closed" || i.status === "Resolved") return "Met";
        if (!i.slaDeadline) return "No SLA";
        const now = new Date();
        const deadline = new Date(i.slaDeadline);
        return (deadline - now <= 0) ? "Breached" : "Active";
      };

      return [
        formatIncidentId(inc.id),
        inc.title || "—",
        formatSpecialization(inc.category) || "—",
        inc.priority || "—",
        inc.status || "—",
        inc.reportedBy || "—",
        inc.assignedAnalystName || "Unassigned",
        getAnalystLevel(inc.assignedTo, usersList) || "—",
        formatTimestamp(inc.timestamp),
        inc.updatedTime ? formatTimestamp(inc.updatedTime) : "—",
        inc.approvedTime ? formatTimestamp(inc.approvedTime) : "—",
        getSlaText(inc),
        inc.status || "—",
        inc.aiAssistantRiskLevel || "—",
        inc.recommendedPriority || "—",
        inc.priority || "—"
      ];
    });

    autoTable(doc, {
      startY: 50,
      head: [tableColumn],
      body: tableRows,
      theme: "grid",
      headStyles: {
        fillColor: [13, 110, 253],
        textColor: [255, 255, 255],
        fontSize: 8,
        fontStyle: "bold"
      },
      bodyStyles: {
        fontSize: 7,
        textColor: [51, 65, 85]
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      },
      tableLineColor: [226, 232, 240],
      tableLineWidth: 0.5,
      margin: { top: 50, bottom: 20, left: 14, right: 14 },
      didDrawPage: (data) => {
        const totalPages = doc.internal.getNumberOfPages();
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        
        const str = `Page ${data.pageNumber} of ${totalPages}`;
        doc.text(str, data.settings.margin.left, doc.internal.pageSize.height - 10);
        doc.text(`Confidential | Generated By: ${currentUsername}`, doc.internal.pageSize.width - data.settings.margin.right - 90, doc.internal.pageSize.height - 10);
      }
    });

    doc.save(`CyberSOC_Active_Incidents_${new Date().toISOString().slice(0,10)}.pdf`);
  };

  // Row click handler avoiding buttons
  const handleRowClick = (e, id) => {
    if (e.target.tagName === "SELECT" || e.target.tagName === "BUTTON" || e.target.tagName === "A" || e.target.closest("button") || e.target.closest("a") || e.target.closest("select")) {
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
            <span>Security Incidents</span>
          </div>

          <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
            <div>
              <h2 className="m-0 fw-bold">{role === "EMPLOYEE" ? "My Active Reported Incidents" : "Incident Operations Roster"}</h2>
              <p className="text-muted m-0">{role === "EMPLOYEE" ? "Track progress and status of your active reported security events." : "Review active security telemetry, assignments, and escalations."}</p>
            </div>
            <div className="d-flex gap-2">
              <button onClick={fetchIncidents} className="btn btn-outline-secondary d-flex align-items-center gap-1.5 fw-bold shadow-sm py-2 px-3">
                Refresh
              </button>
              <button onClick={exportCSV} className="btn btn-outline-success d-flex align-items-center gap-2 shadow-sm py-2 px-3 fw-bold">
                <FaDownload /> Export CSV
              </button>
              <button onClick={exportPDF} className="btn btn-outline-primary d-flex align-items-center gap-2 shadow-sm py-2 px-3 fw-bold">
                <FaDownload /> Export PDF
              </button>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="bg-white p-3 border rounded shadow-sm mb-4">
            <div className="row g-2">
              <div className="col-md-3">
                <div style={{ display: "flex", alignItems: "center", gap: "8px", width: "100%" }}>
                  <label style={{ margin: 0, fontWeight: "bold", color: "#475569", fontSize: "14px", whiteSpace: "nowrap", display: "inline-block" }}>Search:</label>
                  <div style={{ flexGrow: 1, position: "relative" }}>
                    <FaSearch className="position-absolute" style={{ left: "12px", top: "12px", color: "#94a3b8" }} />
                    <input
                      type="text"
                      className="soc-form-control py-1.5"
                      style={{ paddingLeft: "36px", fontSize: "14px" }}
                      placeholder="Search incidents..."
                      value={search}
                      onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                    />
                  </div>
                </div>
              </div>

              <div className="col-md-2 col-6" style={{ minWidth: "150px" }}>
                <select
                  className="soc-form-control py-2"
                  value={priorityFilter}
                  onChange={(e) => { setPriorityFilter(e.target.value); setCurrentPage(1); }}
                >
                  <option value="">Priority: All</option>
                  <option value="Critical">Critical</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>

              <div className="col-md-2 col-6" style={{ minWidth: "210px" }}>
                <select
                  className="soc-form-control py-2"
                  value={statusFilter}
                  onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                >
                  <option value="">{filterParam === "active" ? "Status: All Active" : "Status: All"}</option>
                  <option value="OPEN">Open</option>
                  <option value="PENDING_ASSIGNMENT">Pending Assignment</option>
                  <option value="UNDER_INVESTIGATION">Under Investigation</option>
                  <option value="ESCALATED">Escalated</option>
                  <option value="MANAGEMENT_REVIEW">Management Review</option>
                  <option value="PENDING_ADMIN_APPROVAL">Pending Approval</option>
                  <option value="REOPENED">Reopened</option>
                </select>
              </div>

              <div className="col-md-2 col-6" style={{ minWidth: "170px" }}>
                <select
                  className="soc-form-control py-2"
                  value={categoryFilter}
                  onChange={(e) => { setCategoryFilter(e.target.value); setCurrentPage(1); }}
                >
                  <option value="">Category: All</option>
                  <option value="Malware">Malware</option>
                  <option value="Phishing">Phishing</option>
                  <option value="Ransomware">Ransomware</option>
                  <option value="DDoS">DDoS</option>
                  <option value="Unauthorized Access">Unauthorized Access</option>
                  <option value="Others">Others</option>
                </select>
              </div>

              <div className="col-md-2 col-6">
                <select
                  className="soc-form-control py-2"
                  value={timeFilter}
                  onChange={(e) => { setTimeFilter(e.target.value); setCurrentPage(1); }}
                >
                  <option value="">Date range: All</option>
                  <option value="Today">Today</option>
                  <option value="Week">This Week</option>
                  <option value="Month">This Month</option>
                </select>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="soc-table-wrapper py-5 text-center">
              <div className="spinner-border text-primary" role="status"></div>
              <p className="mt-2 text-muted">Retrieving security incident list...</p>
            </div>
          ) : (
            <>
              {/* Incident Table */}
              <div className="soc-table-wrapper" style={{ overflowX: "auto" }}>
                <table className="soc-table align-middle" style={{ minWidth: "1400px" }}>
                  <thead>
                    <tr>
                      <th style={{ width: "80px", minWidth: "80px" }}>SI No.</th>
                      <th>Professional Incident ID</th>
                      <th>Incident Title</th>
                      <th>Category</th>
                      <th>Priority</th>
                      <th>Status</th>
                      <th>Assigned Analyst</th>
                      <th>Analyst Level</th>
                      <th>Created Date & Time</th>
                      <th>Last Updated</th>
                      <th>SLA Status</th>
                      <th className="text-center" style={{ width: "180px", minWidth: "180px" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentItems.length === 0 ? (
                      <tr>
                        <td colSpan="12" className="text-center py-5 text-muted">
                          No active incidents match the filters.
                        </td>
                      </tr>
                    ) : (
                      currentItems.map((inc, index) => (
                        <tr 
                          key={inc.id}
                          onClick={(e) => handleRowClick(e, inc.id)}
                          style={{ cursor: "pointer" }}
                          className="hover-row-clickable"
                        >
                          <td><strong>{indexOfFirstItem + index + 1}</strong></td>
                          <td><strong>{formatIncidentId(inc.id)}</strong></td>
                          <td>
                            <Link to={`/incidents/${inc.id}`} className="text-dark fw-semibold text-decoration-none">
                              {inc.title}
                            </Link>
                          </td>
                          <td>
                            <span className="badge bg-light text-dark border">
                              {formatSpecialization(inc.category) || "General"}
                            </span>
                          </td>
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
                            <span className="badge bg-light text-dark border">
                              {inc.status}
                            </span>
                          </td>
                          <td>
                            {inc.assignedTo ? (
                              <div className="d-flex align-items-center gap-2">
                                <span>
                                  {(() => {
                                    if (inc.assignedTo && inc.assignedTo.toLowerCase() === "management review") {
                                      return "Management Review";
                                    }
                                    const level = getAnalystLevel(inc.assignedTo, usersList);
                                    const spec = formatSpecialization(getAnalystSpecialization(inc.assignedTo, usersList));
                                    const specStr = spec && spec !== "—" ? ` ${spec}` : "";
                                    const levelClean = level && level !== "—" ? ` (${level.replace(" Analyst", "")}${specStr} Analyst)` : "";
                                    return `${inc.assignedAnalystName || inc.assignedTo}${levelClean}`;
                                  })()}
                                </span>
                                {role === "ADMIN" && inc.status !== "Closed" && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setAssignModalIncident(inc);
                                    }}
                                    className="btn btn-sm btn-link p-0 text-decoration-none fw-bold text-primary animate-fade-in"
                                    title="Manual Override Assignment"
                                    style={{ fontSize: "12px", border: "none", background: "none" }}
                                  >
                                    Change
                                  </button>
                                )}
                              </div>
                            ) : (
                              <div className="d-flex align-items-center gap-2">
                                <span className="text-danger fw-semibold animate-fade-in" style={{ fontSize: "12px" }}>
                                  {inc.status === "PENDING_ASSIGNMENT" ? "No suitable analyst found" : "Unassigned"}
                                </span>
                                {role === "ADMIN" && inc.status !== "Closed" && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setAssignModalIncident(inc);
                                    }}
                                    className="btn btn-sm btn-primary py-0 px-2 fw-semibold animate-fade-in"
                                    style={{ fontSize: "11px", height: "22px" }}
                                  >
                                    Assign Analyst
                                  </button>
                                )}
                              </div>
                            )}
                          </td>
                          <td>{getAnalystLevel(inc.assignedTo, usersList)}</td>
                          <td><small className="text-muted">{formatTimestamp(inc.timestamp)}</small></td>
                          <td><small className="text-muted">{formatTimestamp(inc.approvedTime || inc.timestamp)}</small></td>
                          <td>{getSlaStatus(inc)}</td>
                           <td className="text-center" style={{ width: "180px", minWidth: "180px", whiteSpace: "nowrap" }}>
                            <div className="d-flex justify-content-center gap-1">
                              <button 
                                onClick={() => navigate(`/incidents/${inc.id}`)} 
                                className="btn btn-sm btn-outline-primary"
                                title="View Details"
                              >
                                <FaEye />
                              </button>

                              {role === "ANALYST" && inc.status !== "Escalated" && inc.status !== "Closed" && (
                                <button 
                                  onClick={() => handleEscalateIncident(inc.id)} 
                                  className="btn btn-sm btn-outline-warning"
                                  title="Escalate to L2"
                                >
                                  <FaArrowUp />
                                </button>
                              )}

                              {role === "ADMIN" && inc.status !== "Closed" && (
                                <button 
                                  onClick={() => handleDeleteIncident(inc.id)} 
                                  className="btn btn-sm btn-outline-danger"
                                  title="Delete Incident"
                                >
                                  <FaTrash />
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

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="d-flex justify-content-between align-items-center mt-3 flex-wrap gap-2">
                  <div className="text-muted" style={{ fontSize: "14px" }}>
                    Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredIncidents.length)} of {filteredIncidents.length} incidents
                  </div>
                  <nav>
                    <ul className="pagination pagination-sm m-0">
                      <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                        <button className="page-link" onClick={() => handlePageChange(currentPage - 1)}>Previous</button>
                      </li>
                      {[...Array(totalPages)].map((_, i) => (
                        <li key={i} className={`page-item ${currentPage === i + 1 ? 'active' : ''}`}>
                          <button className="page-link" onClick={() => handlePageChange(i + 1)}>{i + 1}</button>
                        </li>
                      ))}
                      <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                        <button className="page-link" onClick={() => handlePageChange(currentPage + 1)}>Next</button>
                      </li>
                    </ul>
                  </nav>
                </div>
              )}
            </>
          )}
             {assignModalIncident && (
               <div className="modal show d-block animate-fade-in" style={{ backgroundColor: "rgba(0,0,0,0.6)", zIndex: 1050 }}>
                 <div className="modal-dialog modal-lg modal-dialog-centered">
                   <div className="modal-content bg-white shadow border-0 rounded-4">
                     <div className="modal-header border-bottom px-4 py-3 d-flex justify-content-between align-items-center">
                       <h5 className="modal-title fw-bold m-0 text-dark">Assign Analyst to Incident</h5>
                       <button type="button" className="btn-close" style={{ border: "none", background: "none" }} onClick={() => setAssignModalIncident(null)}>&times;</button>
                     </div>
                      <div className="modal-body px-4 py-3" style={{ maxHeight: "550px", overflowY: "auto" }}>
                        <p className="text-muted mb-3" style={{ fontSize: "14px" }}>
                          Select an available analyst from the SOC roster. Specialization matches and current active workload are highlighted.
                        </p>

                        {loadingAiRec ? (
                          <div className="p-3 mb-4 rounded border bg-light text-center">
                            <div className="spinner-border spinner-border-sm text-primary" role="status"></div>
                            <span className="ms-2 text-muted" style={{ fontSize: "13.5px" }}>Analyzing analyst profiles...</span>
                          </div>
                        ) : aiRec && aiRec.recommendedAnalystUsername ? (
                          <div className="p-4 mb-4 rounded-4 border shadow-sm" style={{
                            background: "linear-gradient(135deg, rgba(230, 243, 255, 0.9) 0%, rgba(240, 247, 255, 0.9) 100%)",
                            borderColor: "#b6d4fe",
                            backdropFilter: "blur(10px)"
                          }}>
                            <div className="d-flex justify-content-between align-items-center mb-3">
                              <div>
                                <span className="badge bg-primary text-white text-uppercase px-2.5 py-1.5 fw-bold mb-1" style={{ fontSize: "9.5px", letterSpacing: "0.5px" }}>AI Recommendation</span>
                                <h6 className="m-0 fw-bold text-dark" style={{ fontSize: "16px" }}>
                                  Recommended Analyst: <span className="text-primary">{aiRec.recommendedAnalystName}</span>
                                </h6>
                              </div>
                              <div className="text-end">
                                <div className="fw-extrabold text-primary" style={{ fontSize: "24px", lineHeight: "1" }}>{aiRec.score}%</div>
                                <small className="text-muted fw-semibold" style={{ fontSize: "11px" }}>AI Match Score</small>
                              </div>
                            </div>
                            
                            <div className="mb-3">
                              <div className="text-secondary fw-semibold mb-2" style={{ fontSize: "12px" }}>Explainable Reasons:</div>
                              <div className="d-flex flex-column gap-1.5">
                                {(aiRec.reasons || []).map((reason, idx) => (
                                  <div key={idx} className="d-flex align-items-center gap-2" style={{ fontSize: "13px", color: "#333" }}>
                                    <span className="text-success fw-bold">✓</span>
                                    <span>{reason}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                            
                            <button
                              type="button"
                              className="btn btn-primary btn-sm w-100 fw-bold py-2 rounded-3 shadow-sm d-flex align-items-center justify-content-center gap-1.5"
                              onClick={() => {
                                handleAssignAnalyst(assignModalIncident.id, aiRec.recommendedAnalystUsername);
                                setAssignModalIncident(null);
                              }}
                            >
                              Accept AI Recommendation
                            </button>
                          </div>
                        ) : null}

                        <div className="text-secondary fw-semibold mb-2" style={{ fontSize: "13px" }}>Override with Manual Roster Selection:</div>

                        <div className="d-flex flex-column gap-2">
                          {analysts.length === 0 ? (
                           <p className="text-center text-muted my-4">No analysts currently available.</p>
                         ) : (
                           analysts.map((analyst) => {
                             const activeWorkload = incidents.filter(i => i.assignedTo === analyst.username && i.status !== "Closed").length;
                             return (
                               <div 
                                 key={analyst.id} 
                                 className="d-flex align-items-center justify-content-between p-3 rounded border bg-light hover-card cursor-pointer"
                                 onClick={() => {
                                   handleAssignAnalyst(assignModalIncident.id, analyst.username);
                                   setAssignModalIncident(null);
                                 }}
                                 style={{ transition: "all 0.2s" }}
                               >
                                 <div className="d-flex align-items-center gap-3">
                                   {analyst.profileImage ? (
                                     <img
                                       src={`${window.API_BASE_URL}${analyst.profileImage}`}
                                       alt="Analyst Avatar"
                                       className="rounded-circle border"
                                       style={{ width: "40px", height: "40px", objectFit: "cover" }}
                                     />
                                   ) : (
                                     <div 
                                       className="rounded-circle bg-secondary d-flex align-items-center justify-content-center text-white fw-bold"
                                       style={{ width: "40px", height: "40px", fontSize: "14px" }}
                                     >
                                       {(analyst.fullName || analyst.username || "?").charAt(0).toUpperCase()}
                                     </div>
                                   )}
                                   <div className="text-start">
                                     <strong className="text-dark d-block" style={{ fontSize: "14px" }}>{analyst.fullName}</strong>
                                     <small className="text-muted" style={{ fontSize: "12px" }}>
                                       {analyst.specialization || "Generalist"} ({analyst.analystLevel || "L1"} Analyst)
                                     </small>
                                   </div>
                                 </div>
                                 
                                 <div className="d-flex align-items-center gap-3">
                                   <div className="text-end">
                                     <span className={`badge ${activeWorkload > 3 ? 'bg-danger text-white' : 'bg-success text-white'}`} style={{ fontSize: "11px" }}>
                                       {activeWorkload} Active Caseload
                                     </span>
                                     <span className="badge bg-light text-dark border d-block mt-1" style={{ fontSize: "11px" }}>
                                       Status: {analyst.status || "ACTIVE"}
                                     </span>
                                   </div>
                                 </div>
                               </div>
                             );
                           })
                         )}
                       </div>
                     </div>
                     <div className="modal-footer border-top px-4 py-2.5">
                       <button type="button" className="btn btn-secondary btn-sm" onClick={() => setAssignModalIncident(null)}>Close</button>
                     </div>
                   </div>
                 </div>
               </div>
             )}
        </div>
      </div>
    </div>
  );
}

export default Incidents;