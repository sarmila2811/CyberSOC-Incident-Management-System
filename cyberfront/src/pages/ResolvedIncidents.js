import React, { useEffect, useState, useContext } from "react";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import { Link, useLocation } from "react-router-dom";
import { FaSearch, FaDownload, FaArchive } from "react-icons/fa";
import { formatIncidentId, formatTimestamp, formatSpecialization } from "../utils/format";
import { NotificationContext } from "../context/NotificationContext";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

function ResolutionSummaryCell({ summary }) {
  const [expanded, setExpanded] = useState(false);
  const maxLength = 60; // Truncate threshold character count
  
  if (!summary) return <span className="text-muted">No summary</span>;

  const isLong = summary.length > maxLength;
  const displayText = expanded ? summary : `${summary.slice(0, maxLength)}...`;

  const handleExportTxt = (e) => {
    e.stopPropagation();
    const element = document.createElement("a");
    const file = new Blob([summary], { type: 'text/plain;charset=utf-8' });
    element.href = URL.createObjectURL(file);
    element.download = "resolution_summary.txt";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div style={{ wordBreak: "break-word", whiteSpace: "pre-wrap", minWidth: "220px", maxWidth: "400px" }}>
      <div 
        style={{ 
          maxHeight: expanded ? "200px" : "4.5em", 
          overflowY: expanded ? "auto" : "hidden",
          fontSize: "13px",
          color: "#475569",
          lineHeight: "1.5"
        }}
        className={expanded ? "custom-scroll" : ""}
      >
        {isLong ? displayText : summary}
      </div>
      {isLong && (
        <div className="d-flex gap-2 mt-1" style={{ fontSize: "12px" }}>
          <button 
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }} 
            className="btn btn-link p-0 text-decoration-none fw-bold"
            style={{ fontSize: "12px", color: "#0d6efd" }}
          >
            {expanded ? "Collapse" : "Expand"}
          </button>
          <button 
            onClick={handleExportTxt} 
            className="btn btn-link p-0 text-decoration-none fw-bold text-success"
            style={{ fontSize: "12px" }}
          >
            Export TXT
          </button>
        </div>
      )}
    </div>
  );
}

function ResolvedIncidents() {
  const [resolved, setResolved] = useState([]);
  const { refreshTrigger } = useContext(NotificationContext);
  const [loading, setLoading] = useState(true);
  const [usersList, setUsersList] = useState([]);
  
  // Search & Filters and Pagination
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const currentUser = JSON.parse(localStorage.getItem("currentUser") || "{}");
  const username = currentUser?.username;
  const role = currentUser?.role?.toUpperCase();

  const location = useLocation();

  useEffect(() => {
    if (location.state) {
      if (location.state.priority !== undefined) setPriorityFilter(location.state.priority);
      if (location.state.category !== undefined) setCategoryFilter(location.state.category);
    } else {
      setPriorityFilter("");
      setCategoryFilter("");
    }
  }, [location.state]);

  const fetchResolved = async () => {
    try {
      setLoading(true);
      const headers = { "Authorization": `Bearer ${localStorage.getItem("token")}` };
      const [res, resUsers] = await Promise.all([
        fetch(window.API_BASE_URL + "/api/incidents/resolved", { headers }),
        fetch(window.API_BASE_URL + "/api/users", { headers })
      ]);
      if (res.ok) {
        const data = await res.json();
        const unique = [];
        const seen = new Set();
        for (const item of (data || [])) {
          const key = item.incidentId || item.id;
          if (key && !seen.has(key)) {
            seen.add(key);
            unique.push(item);
          }
        }
        setResolved(unique);
      }
      if (resUsers.ok) {
        setUsersList(await resUsers.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResolved();
  }, [refreshTrigger]);

  const filtered = resolved.filter(i => {
    // Role level restrictions for Employee
    if (role === "EMPLOYEE" && (i.reportedBy || "").toLowerCase() !== username.toLowerCase()) {
      return false;
    }

    const q = search.toLowerCase();
    const matchSearch = !search ||
      String(i.incidentId).includes(q) ||
      (i.title || "").toLowerCase().includes(q) ||
      (i.assignedAnalyst || "").toLowerCase().includes(q) ||
      (i.approvedBy || "").toLowerCase().includes(q) ||
      (i.resolutionSummary || "").toLowerCase().includes(q);

    const matchPriority = !priorityFilter || i.priority === priorityFilter;
    const matchCategory = !categoryFilter || i.category === categoryFilter;

    return matchSearch && matchPriority && matchCategory;
  });

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = filtered.slice(startIndex, startIndex + itemsPerPage);

  // Export Excel
  const handleExportExcel = () => {
    let xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center" ss:WrapText="1"/>
   <Borders/>
   <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="11" ss:Color="#000000"/>
   <Interior/>
   <NumberFormat/>
   <Protection/>
  </Style>
  <Style ss:ID="Header">
   <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#198754" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="Resolved Incidents">
  <Table>
   <Column ss:Width="80"/>
   <Column ss:Width="200"/>
   <Column ss:Width="100"/>
   <Column ss:Width="80"/>
   <Column ss:Width="100"/>
   <Column ss:Width="120"/>
   <Column ss:Width="120"/>
   <Column ss:Width="150"/>
   <Column ss:Width="150"/>
   <Column ss:Width="80"/>
   <Column ss:Width="220"/>
   <Column ss:Width="300"/>
   <Column ss:Width="100"/>
   <Column ss:Width="120"/>
   <Column ss:Width="100"/>
   <Row ss:Height="24">
    <Cell ss:StyleID="Header"><Data ss:Type="String">Incident ID</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Title</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Category</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Priority</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Reporter</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Assigned Analyst</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Approved By</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Created Time</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Resolved Time</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">SLA Status</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Workflow</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Resolution Summary</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">AI Risk Level</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">AI Recommended Priority</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Current Priority</Data></Cell>
   </Row>`;

    filtered.forEach(i => {
      const escapeXml = (str) => {
        if (!str) return "";
        return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
      };
      
      xml += `
   <Row ss:Height="20">
    <Cell><Data ss:Type="String">${escapeXml(formatIncidentId(i.incidentId))}</Data></Cell>
    <Cell><Data ss:Type="String">${escapeXml(i.title)}</Data></Cell>
    <Cell><Data ss:Type="String">${escapeXml(formatSpecialization(i.category))}</Data></Cell>
    <Cell><Data ss:Type="String">${escapeXml(i.priority)}</Data></Cell>
    <Cell><Data ss:Type="String">${escapeXml(i.reportedBy || "System")}</Data></Cell>
    <Cell><Data ss:Type="String">${escapeXml(i.assignedAnalyst || "System")}</Data></Cell>
    <Cell><Data ss:Type="String">${escapeXml(i.approvedBy || "Admin")}</Data></Cell>
    <Cell><Data ss:Type="String">${escapeXml(i.timestamp ? formatTimestamp(i.timestamp) : "N/A")}</Data></Cell>
    <Cell><Data ss:Type="String">${escapeXml(i.resolvedTime ? formatTimestamp(i.resolvedTime) : "N/A")}</Data></Cell>
    <Cell><Data ss:Type="String">${escapeXml(i.slaStatus || "IN_SLA")}</Data></Cell>
    <Cell><Data ss:Type="String">${escapeXml(i.workflow || "Reported -> Assigned -> Resolved -> Closed")}</Data></Cell>
    <Cell><Data ss:Type="String">${escapeXml(i.resolutionSummary || "N/A")}</Data></Cell>
    <Cell><Data ss:Type="String">${escapeXml(i.aiAssistantRiskLevel || "—")}</Data></Cell>
    <Cell><Data ss:Type="String">${escapeXml(i.recommendedPriority || "—")}</Data></Cell>
    <Cell><Data ss:Type="String">${escapeXml(i.priority || "Medium")}</Data></Cell>
   </Row>`;
    });

    xml += `
  </Table>
 </Worksheet>
</Workbook>`;

    const blob = new Blob([xml], { type: "application/vnd.ms-excel" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `cybersoc_resolved_report_${new Date().toISOString().slice(0,10)}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      "Incident ID", "Title", "Category", "Priority", "Reporter", 
      "Assigned Analyst", "Approved By", "Created Time", "Resolved Time", 
      "SLA Status", "Workflow", "Resolution Summary", "AI Risk Level", "AI Recommended Priority", "Current Priority"
    ];
    const rows = filtered.map(i => [
      formatIncidentId(i.incidentId),
      `"${i.title ? i.title.replace(/"/g, '""') : ''}"`,
      formatSpecialization(i.category),
      i.priority,
      i.reportedBy || "System",
      i.assignedAnalyst || "N/A",
      i.approvedBy || "N/A",
      i.timestamp ? formatTimestamp(i.timestamp) : "N/A",
      i.resolvedTime ? formatTimestamp(i.resolvedTime) : "N/A",
      i.slaStatus || "IN_SLA",
      i.workflow || "Reported -> Assigned -> Resolved -> Closed",
      `"${i.resolutionSummary ? i.resolutionSummary.replace(/"/g, '""') : ''}"`,
      i.aiAssistantRiskLevel || "—",
      i.recommendedPriority || "—",
      i.priority || "—"
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `cybersoc_resolved_incidents_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export PDF
  const handleExportPDF = () => {
    const doc = new jsPDF("landscape");
    
    // Header Style
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(25, 135, 84); // Green theme for resolved
    doc.text("CyberSOC Operations Console", 14, 20);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text("Resolved & Closed Incidents Archive Registry", 14, 26);
    doc.text(`Generated: ${new Date().toLocaleString()} | User: ${username}`, 14, 32);
    
    doc.setDrawColor(226, 232, 240);
    doc.line(14, 35, 282, 35);
    
    // Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(30, 41, 59);
    doc.text("Resolved Incidents Log", 14, 45);
    
    const tableHeaders = [[
      "ID", "Title", "Category", "Priority", "Reporter", 
      "Analyst", "Approved By", "Created Time", "Resolved Time", 
      "SLA Status", "Workflow", "Resolution Summary", "AI Risk Level", "AI Recommended Priority", "Current Priority"
    ]];
    const tableData = filtered.map(i => [
      formatIncidentId(i.incidentId),
      i.title || "No Title",
      formatSpecialization(i.category) || "General",
      i.priority || "Medium",
      i.reportedBy || "System",
      i.assignedAnalyst || "N/A",
      i.approvedBy || "N/A",
      i.timestamp ? formatTimestamp(i.timestamp) : "N/A",
      i.resolvedTime ? formatTimestamp(i.resolvedTime) : "N/A",
      i.slaStatus || "IN_SLA",
      i.workflow || "Reported -> Assigned -> Resolved -> Closed",
      i.resolutionSummary || "N/A",
      i.aiAssistantRiskLevel || "—",
      i.recommendedPriority || "—",
      i.priority || "—"
    ]);

    autoTable(doc, {
      startY: 50,
      head: tableHeaders,
      body: tableData,
      theme: "grid",
      styles: {
        overflow: 'linebreak',
        fontSize: 7,
        cellPadding: 2
      },
      headStyles: {
        fillColor: [25, 135, 84],
        textColor: [255, 255, 255],
        fontSize: 7,
        fontStyle: "bold"
      },
      bodyStyles: {
        fontSize: 7,
        textColor: [51, 65, 85]
      },
      columnStyles: {
        0: { cellWidth: 15 },
        1: { cellWidth: 35 },
        2: { cellWidth: 20 },
        3: { cellWidth: 15 },
        4: { cellWidth: 20 },
        5: { cellWidth: 20 },
        6: { cellWidth: 20 },
        7: { cellWidth: 25 },
        8: { cellWidth: 25 },
        9: { cellWidth: 15 },
        10: { cellWidth: 30 },
        11: { cellWidth: 40 }
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      },
      tableLineColor: [226, 232, 240],
      tableLineWidth: 0.5,
      margin: { top: 50, bottom: 20, left: 10, right: 10 },
      didDrawPage: (data) => {
        const totalPages = doc.internal.getNumberOfPages();
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        
        const str = `Page ${data.pageNumber} of ${totalPages}`;
        doc.text(str, data.settings.margin.left, doc.internal.pageSize.height - 10);
        doc.text("CONFIDENTIAL - FOR INTERNAL SOC USE ONLY", doc.internal.pageSize.width - data.settings.margin.right - 80, doc.internal.pageSize.height - 10);
      }
    });

    doc.save(`cybersoc_resolved_incidents_${new Date().toISOString().slice(0,10)}.pdf`);
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
            <span>Resolved Incidents Archive</span>
          </div>

          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h2 className="m-0 fw-bold">Resolved Incidents Archive</h2>
              <p className="text-muted m-0">Immutable record of mitigated security alerts and resolution approvals.</p>
            </div>
            <div className="d-flex gap-2">
              <button onClick={fetchResolved} className="btn btn-outline-secondary d-flex align-items-center gap-1.5 fw-semibold">
                Refresh
              </button>
              <button onClick={handleExportExcel} className="btn btn-outline-success d-flex align-items-center gap-1.5 fw-semibold">
                <FaDownload /> Excel
              </button>
              <button onClick={handleExportCSV} className="btn btn-outline-secondary d-flex align-items-center gap-1.5 fw-semibold">
                <FaDownload /> CSV
              </button>
              <button onClick={handleExportPDF} className="btn btn-outline-secondary d-flex align-items-center gap-1.5 fw-semibold">
                <FaDownload /> PDF
              </button>
            </div>
          </div>

          {/* Filtering row */}
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
                      placeholder="Search ID, title, analyst, resolution..."
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

              <div className="col-lg-3">
                <select
                  className="soc-form-control py-1.5"
                  style={{ fontSize: "14px" }}
                  value={categoryFilter}
                  onChange={(e) => { setCategoryFilter(e.target.value); setCurrentPage(1); }}
                >
                  <option value="">Category: All</option>
                  <option value="PHISHING">Phishing</option>
                  <option value="MALWARE">Malware</option>
                  <option value="NETWORK">Network Attack</option>
                  <option value="RANSOMWARE">Ransomware</option>
                </select>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="soc-card py-5 text-center">
              <div className="spinner-border text-primary" role="status"></div>
              <p className="mt-2 text-muted">Loading resolved incidents...</p>
            </div>
          ) : (
            <div className="soc-table-wrapper">
              <table className="soc-table">
                <thead>
                  <tr>
                    <th style={{ width: "80px", minWidth: "80px" }}>SI No.</th>
                    <th>Incident ID</th>
                    <th>Title</th>
                    <th>Category</th>
                    <th>Priority</th>
                    <th>Assigned Analyst</th>
                    <th>Closed Time</th>
                    <th>Approved By</th>
                    <th>Resolution Summary</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="text-center py-5 text-muted">
                        No resolved incidents found.
                      </td>
                    </tr>
                  ) : (
                    paginatedData.map((i, index) => (
                      <tr key={i.id}>
                        <td><strong>{startIndex + index + 1}</strong></td>
                        <td><strong>{formatIncidentId(i.incidentId)}</strong></td>
                        <td className="fw-semibold">{i.title}</td>
                        <td><span className="badge bg-light text-dark border">{formatSpecialization(i.category)}</span></td>
                        <td>
                          <span className={`badge-status ${
                            i.priority === 'Critical' ? 'bg-danger-subtle text-danger' :
                            i.priority === 'High' ? 'bg-warning-subtle text-warning' : 'bg-success-subtle text-success'
                          }`}>
                            {i.priority}
                          </span>
                        </td>
                        <td>{(() => {
                          const username = i.assignedAnalyst;
                          if (!username || username.toLowerCase() === "system") return "System";
                          if (username.toLowerCase() === "management review") return "Management Review";
                          const found = usersList.find(u => u.username && u.username.toLowerCase() === username.toLowerCase());
                          return found ? found.fullName : username;
                        })()}</td>
                        <td><small className="text-muted">{formatTimestamp(i.closedTime || i.resolvedTime || i.timestamp)}</small></td>
                        <td><strong>{i.approvedBy || "Admin"}</strong></td>
                        <td>
                          <ResolutionSummaryCell summary={i.resolutionSummary} />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              
              {totalPages > 1 && (
                <div className="d-flex justify-content-between align-items-center mt-3 px-3 pb-3">
                  <div className="text-muted" style={{ fontSize: "13px" }}>
                    Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filtered.length)} of {filtered.length} entries
                  </div>
                  <nav>
                    <ul className="pagination pagination-sm m-0 gap-1">
                      <li className={`page-item ${currentPage === 1 ? "disabled" : ""}`}>
                        <button className="page-link soc-btn-outline-secondary" onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}>
                          Previous
                        </button>
                      </li>
                      {[...Array(totalPages)].map((_, index) => (
                        <li key={index} className={`page-item ${currentPage === index + 1 ? "active" : ""}`}>
                          <button className="page-link" onClick={() => setCurrentPage(index + 1)}>
                            {index + 1}
                          </button>
                        </li>
                      ))}
                      <li className={`page-item ${currentPage === totalPages ? "disabled" : ""}`}>
                        <button className="page-link soc-btn-outline-secondary" onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}>
                          Next
                        </button>
                      </li>
                    </ul>
                  </nav>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ResolvedIncidents;
