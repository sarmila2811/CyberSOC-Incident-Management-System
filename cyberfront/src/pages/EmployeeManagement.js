import React, { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import { Link, useNavigate } from "react-router-dom";
import { FaSearch, FaChevronRight, FaDownload } from "react-icons/fa";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatTimestamp } from "../utils/format";

function EmployeeManagement() {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Search, Filter, Sort States
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortField, setSortField] = useState("fullName");
  const [sortOrder, setSortOrder] = useState("asc");

  const fetchData = async () => {
    try {
      setLoading(true);
      const headers = { "Authorization": `Bearer ${localStorage.getItem("token")}` };
      
      const [resUsers, resActive, resResolved] = await Promise.all([
        fetch(window.API_BASE_URL + "/api/users", { headers }),
        fetch(window.API_BASE_URL + "/api/incidents", { headers }),
        fetch(window.API_BASE_URL + "/api/incidents/resolved", { headers })
      ]);

      if (resUsers.ok && resActive.ok && resResolved.ok) {
        const users = await resUsers.json();
        const active = await resActive.json();
        const resolved = await resResolved.json();

        // Filter only employees
        const emps = users.filter(u => (u.role || "").toLowerCase() === "employee");

        // Map calculated stats for each employee
        const processedEmps = emps.map(emp => {
          const usernameLower = (emp.username || "").toLowerCase();
          
          const empActive = active.filter(i => (i.reportedBy || "").toLowerCase() === usernameLower);
          const empResolved = resolved.filter(i => (i.reportedBy || "").toLowerCase() === usernameLower);

          const total = empActive.length + empResolved.length;
          const open = empActive.filter(i => (i.status || "").toLowerCase() === "open").length;
          const resolvedCount = empResolved.length + empActive.filter(i => (i.status || "").toLowerCase() === "closed").length;
          const critical = empActive.filter(i => (i.priority || "").toLowerCase() === "critical").length + 
                           empResolved.filter(i => (i.priority || "").toLowerCase() === "critical").length;
          const underInvestigation = empActive.filter(i => ["under_investigation", "under investigation", "escalated", "reopened"].includes((i.status || "").toLowerCase())).length;

          const allEmpIncidents = [...empActive, ...empResolved];
          let lastIncidentDate = "—";
          if (allEmpIncidents.length > 0) {
            const dates = allEmpIncidents.map(i => new Date(i.timestamp)).filter(d => !isNaN(d.getTime()));
            if (dates.length > 0) {
              const maxDate = new Date(Math.max(...dates));
              lastIncidentDate = formatTimestamp(maxDate.toISOString());
            }
          }

          return {
            ...emp,
            totalReports: total,
            openReports: open,
            resolvedReports: resolvedCount,
            criticalReports: critical,
            underInvestigation,
            lastIncidentDate
          };
        });

        setEmployees(processedEmps);
      }
    } catch (err) {
      console.error("Error loading employee roster:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Sort helper
  const handleSort = (field) => {
    const isAsc = sortField === field && sortOrder === "asc";
    setSortField(field);
    setSortOrder(isAsc ? "desc" : "asc");
  };

  // Unique departments for filter
  const departments = [...new Set(employees.map(e => e.department).filter(Boolean))];

  // Filtering
  const filtered = employees.filter(emp => {
    const q = search.toLowerCase();
    const matchSearch = !search ||
      (emp.fullName || "").toLowerCase().includes(q) ||
      (emp.username || "").toLowerCase().includes(q) ||
      (emp.email || "").toLowerCase().includes(q) ||
      (emp.department || "").toLowerCase().includes(q);

    const matchDept = !deptFilter || emp.department === deptFilter;
    const matchStatus = !statusFilter || emp.status === statusFilter;

    return matchSearch && matchDept && matchStatus;
  });

  // Sorting
  const sorted = [...filtered].sort((a, b) => {
    let valA = a[sortField];
    let valB = b[sortField];

    if (valA === undefined || valA === null) valA = "";
    if (valB === undefined || valB === null) valB = "";

    if (typeof valA === "string") {
      return sortOrder === "asc" 
        ? valA.localeCompare(valB)
        : valB.localeCompare(valA);
    } else {
      return sortOrder === "asc"
        ? valA - valB
        : valB - valA;
    }
  });

  const handleExportCSV = () => {
    const csvHeaders = ["Employee", "Department", "Total Reports", "Resolved", "Critical"];
    const rows = sorted.map(emp => [
      emp.fullName || emp.username,
      emp.department || "—",
      emp.totalReports || 0,
      emp.resolvedReports || 0,
      emp.criticalReports || 0
    ]);

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + [csvHeaders.join(","), ...rows.map(r => r.join(","))].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `cybersoc_employee_directory_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDF = () => {
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
    doc.text("Employee Operations Directory Log", 14, 26);
    doc.text(`Generated: ${new Date().toLocaleString()} | User: ${currentUsername}`, 14, 32);
    
    doc.setDrawColor(226, 232, 240);
    doc.line(14, 35, 283, 35);
    
    // Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(30, 41, 59);
    doc.text("Employee Roster Details", 14, 45);
    
    const tableHeaders = [["ID", "Name", "Department", "Total Reports", "Open Reports", "Resolved Reports", "Critical Reports", "Under Investigation", "Last Incident Date"]];
    const tableData = sorted.map(emp => [
      emp.id,
      emp.fullName || emp.username,
      emp.department || "—",
      emp.totalReports || 0,
      emp.openReports || 0,
      emp.resolvedReports || 0,
      emp.criticalReports || 0,
      emp.underInvestigation || 0,
      emp.lastIncidentDate || "—"
    ]);
    
    autoTable(doc, {
      startY: 50,
      head: tableHeaders,
      body: tableData,
      theme: "grid",
      headStyles: {
        fillColor: [13, 110, 253],
        textColor: [255, 255, 255],
        fontSize: 9,
        fontStyle: "bold"
      },
      bodyStyles: {
        fontSize: 8,
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
    
    doc.save(`CyberSOC_Employee_Roster_${new Date().toISOString().slice(0, 10)}.pdf`);
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
            <span>Employee Roster Management</span>
          </div>

          <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
            <div>
              <h2 className="m-0 fw-bold">Admin Employee Directory</h2>
              <p className="text-muted m-0">Track employee profiles, credential data, and incident report statistics.</p>
            </div>
            <div className="d-flex gap-2">
              <button onClick={fetchData} className="btn btn-outline-secondary d-flex align-items-center gap-1.5 fw-bold shadow-sm py-2 px-3">
                Refresh
              </button>
              <button onClick={handleExportCSV} className="btn btn-outline-success d-flex align-items-center gap-1.5 fw-bold shadow-sm py-2 px-3">
                <FaDownload /> Export CSV
              </button>
              <button onClick={handleExportPDF} className="btn btn-outline-primary d-flex align-items-center gap-1.5 fw-bold shadow-sm py-2 px-3">
                <FaDownload /> Export PDF
              </button>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="soc-card mb-4" style={{ padding: "16px" }}>
            <div className="row g-2 align-items-center">
              <div className="col-lg-4">
                <div style={{ display: "flex", alignItems: "center", gap: "8px", width: "100%" }}>
                  <label style={{ margin: 0, fontWeight: "bold", color: "#475569", fontSize: "14px", whiteSpace: "nowrap", display: "inline-block" }}>Search:</label>
                  <div style={{ flexGrow: 1, position: "relative" }}>
                    <FaSearch className="position-absolute" style={{ left: "12px", top: "12px", color: "#94a3b8" }} />
                    <input
                      type="text"
                      className="soc-form-control py-1.5"
                      style={{ paddingLeft: "36px", fontSize: "14px" }}
                      placeholder="Search by name, username, department..."
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
                  value={deptFilter}
                  onChange={(e) => setDeptFilter(e.target.value)}
                >
                  <option value="">Department: All</option>
                  {departments.map((dept, i) => (
                    <option key={i} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>

              <div className="col-lg-3">
                <select
                  className="soc-form-control py-1.5"
                  style={{ fontSize: "14px" }}
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="">Status: All</option>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="soc-card py-5 text-center">
              <div className="spinner-border text-primary" role="status"></div>
              <p className="mt-2 text-muted">Analyzing employee data feeds...</p>
            </div>
          ) : (
            <div className="soc-table-wrapper">
              <table className="soc-table">
                <thead>
                  <tr style={{ cursor: "pointer" }}>
                    <th>Profile</th>
                    <th onClick={() => handleSort("fullName")}>Employee Name</th>
                    <th onClick={() => handleSort("username")}>Username</th>
                    <th onClick={() => handleSort("department")}>Department</th>
                    <th>Email Address</th>
                    <th>Phone</th>
                    <th onClick={() => handleSort("totalReports")} className="text-center">Total Reports</th>
                    <th onClick={() => handleSort("openReports")} className="text-center text-info">Open</th>
                    <th onClick={() => handleSort("resolvedReports")} className="text-center text-success">Resolved</th>
                    <th onClick={() => handleSort("criticalReports")} className="text-center text-danger">Critical</th>
                    <th onClick={() => handleSort("status")}>Status</th>
                    <th>Created Date</th>
                    <th className="text-center" style={{ width: "80px", minWidth: "80px" }}>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.length === 0 ? (
                    <tr>
                      <td colSpan="13" className="text-center py-5 text-muted">
                        No employees found matching the filters.
                      </td>
                    </tr>
                  ) : (
                    sorted.map(emp => (
                      <tr 
                        key={emp.id} 
                        style={{ cursor: "pointer" }} 
                        onClick={() => navigate(`/employees/${emp.id}`)}
                        className="align-middle hover-row"
                      >
                        <td>
                          {emp.profileImage ? (
                            <img
                              src={`${window.API_BASE_URL}${emp.profileImage}`}
                              alt="Avatar"
                              className="rounded-circle border"
                              style={{ width: "32px", height: "32px", objectFit: "cover" }}
                            />
                          ) : (
                            <div 
                              className="rounded-circle bg-secondary d-flex align-items-center justify-content-center text-white fw-bold"
                              style={{ width: "32px", height: "32px", fontSize: "12px" }}
                            >
                              {(emp.fullName || emp.username || "?").charAt(0).toUpperCase()}
                            </div>
                          )}
                        </td>
                        <td><strong>{emp.fullName || "Unspecified"}</strong></td>
                        <td>{emp.username}</td>
                        <td>{emp.department || "N/A"}</td>
                        <td>{emp.email}</td>
                        <td>{emp.phone || "—"}</td>
                        <td className="text-center fw-bold">{emp.totalReports}</td>
                        <td className="text-center fw-bold text-info">{emp.openReports}</td>
                        <td className="text-center fw-bold text-success">{emp.resolvedReports}</td>
                        <td className="text-center fw-bold text-danger">{emp.criticalReports}</td>
                        <td>
                          <span className={`badge ${emp.status === 'ACTIVE' ? 'bg-success-subtle text-success' : 'bg-secondary-subtle text-secondary'}`}>
                            {emp.status}
                          </span>
                        </td>
                        <td>
                          <small className="text-muted">{formatTimestamp(emp.createdDate)}</small>
                        </td>
                         <td className="text-center text-primary" style={{ width: "80px", minWidth: "80px" }}>
                          <FaChevronRight style={{ fontSize: "12px" }} />
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

export default EmployeeManagement;
