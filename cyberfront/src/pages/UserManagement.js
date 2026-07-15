import React, { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import { Link, useLocation } from "react-router-dom";
import { FaUserPlus, FaUserEdit, FaTrash, FaUserShield, FaUserCheck, FaUserTimes, FaLock, FaSearch } from "react-icons/fa";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatTimestamp, formatSpecialization } from "../utils/format";

function UserManagement() {
  const location = useLocation();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    if (location.state) {
      if (location.state.role) setRoleFilter(location.state.role);
      if (location.state.status) setStatusFilter(location.state.status);
    } else {
      setRoleFilter("");
      setStatusFilter("");
    }
  }, [location.state]);

  // Edit / Create States
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState("create"); // create or edit
  const [selectedUser, setSelectedUser] = useState(null);
  const [form, setForm] = useState({
    username: "",
    fullName: "",
    email: "",
    phone: "",
    department: "",
    password: "",
    role: "EMPLOYEE",
    analystLevel: "L1",
    specialization: "PHISHING",
    status: "ACTIVE"
  });

  const [selectedSpec, setSelectedSpec] = useState("PHISHING");
  const [customSpec, setCustomSpec] = useState("");
  const [createdTempPassword, setCreatedTempPassword] = useState("");

  const predefinedSpecs = [
    "MALWARE", "PHISHING", "WEB SECURITY", "NETWORK SECURITY", 
    "EMAIL SECURITY", "DATA SECURITY", "IDENTITY_ACCESS", 
    "ENDPOINT SECURITY", "THREAT INTELLIGENCE", "CLOUD SECURITY", 
    "APPLICATION SECURITY", "DIGITAL FORENSICS"
  ];

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch(window.API_BASE_URL + "/api/users", {
        headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleOpenCreate = () => {
    setModalMode("create");
    setSelectedUser(null);
    setForm({
      username: "",
      fullName: "",
      email: "",
      phone: "",
      department: "",
      password: "",
      role: "EMPLOYEE",
      analystLevel: "L1",
      specialization: "PHISHING",
      status: "ACTIVE"
    });
    setSelectedSpec("PHISHING");
    setCustomSpec("");
    setShowModal(true);
  };

  const handleOpenEdit = (user) => {
    setModalMode("edit");
    setSelectedUser(user);
    setForm({
      username: user.username || "",
      fullName: user.fullName || "",
      email: user.email || "",
      phone: user.phone || "",
      department: user.department || "",
      password: "", // do not populate password
      role: user.role || "EMPLOYEE",
      analystLevel: user.analystLevel || "L1",
      specialization: user.specialization || "PHISHING",
      status: user.status || "ACTIVE"
    });
    const specUpper = (user.specialization || "").toUpperCase().trim();
    const isPredefined = predefinedSpecs.includes(specUpper);
    setSelectedSpec(isPredefined ? specUpper : (specUpper ? "OTHER" : "PHISHING"));
    setCustomSpec(isPredefined ? "" : user.specialization || "");
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      let res;
      const headers = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${localStorage.getItem("token")}`
      };

      const finalSpec = selectedSpec === "OTHER" ? customSpec : selectedSpec;
      const bodyForm = { ...form, specialization: finalSpec };

      if (modalMode === "create") {
        res = await fetch(window.API_BASE_URL + "/api/users", {
          method: "POST",
          headers,
          body: JSON.stringify(bodyForm)
        });
      } else {
        res = await fetch(`${window.API_BASE_URL}/api/users/${selectedUser.id}`, {
          method: "PUT",
          headers,
          body: JSON.stringify(bodyForm)
        });
      }

      if (res.ok) {
        const savedData = await res.json();
        setShowModal(false);
        fetchUsers();
        if (modalMode === "create") {
          setCreatedTempPassword(savedData.tempPassword);
        } else {
          alert("User updated successfully");
        }
      } else {
        const data = await res.json();
        alert(data.message || "Operation failed.");
      }
    } catch (err) {
      alert("Server connection failed.");
    }
  };

  const handleToggleStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try {
      const res = await fetch(`${window.API_BASE_URL}/api/users/${id}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        fetchUsers();
      }
    } catch (err) {
      alert("Error toggling status");
    }
  };

  const handleResetPassword = async (id) => {
    const pw = window.prompt("Enter new password for this user:");
    if (!pw) return;
    try {
      const res = await fetch(`${window.API_BASE_URL}/api/users/${id}/reset-password`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({ password: pw })
      });
      if (res.ok) {
        alert("Password reset successfully");
      }
    } catch (err) {
      alert("Reset password error");
    }
  };

  const handleDeleteUser = async (id) => {
    if (!window.confirm("Are you sure you want to permanently delete this user?")) return;
    try {
      const res = await fetch(`${window.API_BASE_URL}/api/users/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
      });
      if (res.ok) {
        alert("User deleted");
        fetchUsers();
      }
    } catch (err) {
      alert("Error deleting user");
    }
  };

  // Filters search
  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    const matchSearch = !search ||
      (u.fullName || "").toLowerCase().includes(q) ||
      (u.username || "").toLowerCase().includes(q) ||
      (u.email || "").toLowerCase().includes(q) ||
      (u.department || "").toLowerCase().includes(q);

    const matchRole = !roleFilter || u.role === roleFilter;
    const matchStatus = !statusFilter || u.status === statusFilter;

    return matchSearch && matchRole && matchStatus;
  });

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
    doc.text("SOC User Registry Report", 14, 26);
    doc.text(`Generated: ${new Date().toLocaleString()} | User: ${currentUsername}`, 14, 32);
    
    doc.setDrawColor(226, 232, 240);
    doc.line(14, 35, 283, 35);
    
    // Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(30, 41, 59);
    doc.text("SOC User Registry Log", 14, 45);
    
    const tableHeaders = [["User ID", "Username", "Full Name", "Role", "Department", "Specialization", "Level", "Email", "Phone", "Status", "Last Login", "Created Date"]];
    const tableData = filtered.map(u => [
      u.id,
      u.username,
      u.fullName || "—",
      u.role,
      u.department || "—",
      formatSpecialization(u.specialization),
      u.analystLevel || "—",
      u.email || "—",
      u.phone || "—",
      u.status,
      u.lastLogin ? formatTimestamp(u.lastLogin) : "—",
      u.createdDate ? formatTimestamp(u.createdDate) : "—"
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
    
    doc.save(`CyberSOC_User_Registry_${new Date().toISOString().slice(0, 10)}.pdf`);
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
            <span>User Management Console</span>
          </div>

          <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
            <div>
              <h2 className="m-0 fw-bold">User Management Console</h2>
              <p className="text-muted m-0">Review profiles, toggle account status, and edit SOC credentials.</p>
            </div>
            <div className="d-flex gap-2">
              <button onClick={() => { fetchUsers(); }} className="btn btn-outline-secondary d-flex align-items-center gap-1.5 fw-bold shadow-sm py-2 px-3">
                Refresh
              </button>
              <button onClick={handleExportPDF} className="btn btn-outline-primary d-flex align-items-center gap-1.5 fw-bold shadow-sm py-2 px-3">
                Export PDF
              </button>
              <button onClick={handleOpenCreate} className="btn btn-soc btn-soc-primary">
                <FaUserPlus /> Create User Account
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
                      placeholder="Search by name, username, email..."
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
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                >
                  <option value="">Role: All</option>
                  <option value="ADMIN">Admin</option>
                  <option value="ANALYST">Analyst</option>
                  <option value="EMPLOYEE">Employee</option>
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
              <p className="mt-2 text-muted">Retrieving user roster details...</p>
            </div>
          ) : (
            <div className="soc-table-wrapper">
              <table className="soc-table">
                <thead>
                  <tr>
                    <th>Full Name</th>
                    <th>Username</th>
                    <th>Email Address</th>
                    <th>Role</th>
                    <th>Department</th>
                    <th>Specialization / Level</th>
                    <th>Status</th>
                    <th className="text-center" style={{ width: "160px", minWidth: "160px" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="text-center py-5 text-muted">
                        No registered users match the filters.
                      </td>
                    </tr>
                  ) : (
                    filtered.map(u => (
                      <tr key={u.id}>
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            {u.profileImage ? (
                              <img
                                src={`${window.API_BASE_URL}${u.profileImage}`}
                                alt="Avatar"
                                className="rounded-circle border"
                                style={{ width: "32px", height: "32px", objectFit: "cover" }}
                              />
                            ) : (
                              <div 
                                className="rounded-circle bg-secondary d-flex align-items-center justify-content-center text-white fw-bold"
                                style={{ width: "32px", height: "32px", fontSize: "14px" }}
                              >
                                {(u.fullName || u.username || "?").charAt(0).toUpperCase()}
                              </div>
                            )}
                            <strong>{u.fullName || "Unspecified"}</strong>
                          </div>
                        </td>
                        <td>{u.username}</td>
                        <td>{u.email}</td>
                        <td>
                          <span className={`badge ${
                            u.role === 'ADMIN' ? 'bg-danger-subtle text-danger' :
                            u.role === 'ANALYST' ? 'bg-warning-subtle text-warning' : 'bg-success-subtle text-success'
                          }`} style={{ fontSize: "11px" }}>
                            {u.role}
                          </span>
                        </td>
                        <td>{u.department || "N/A"}</td>
                        <td>
                          {u.role === "ANALYST" ? (
                            <span className="badge bg-light text-dark border">
                              {formatSpecialization(u.specialization)} ({u.analystLevel || "L1"})
                            </span>
                          ) : "—"}
                        </td>
                        <td>
                          <button
                            onClick={() => handleToggleStatus(u.id, u.status)}
                            className={`btn btn-sm ${u.status === 'ACTIVE' ? 'btn-outline-success' : 'btn-outline-secondary'}`}
                            style={{ fontSize: "12px", width: "90px" }}
                          >
                            {u.status === 'ACTIVE' ? <FaUserCheck /> : <FaUserTimes />} {u.status}
                          </button>
                        </td>
                        <td className="text-center" style={{ width: "160px", minWidth: "160px" }}>
                          <div className="d-flex justify-content-center gap-2">
                            <button onClick={() => handleOpenEdit(u)} className="btn btn-sm btn-outline-primary" title="Edit Profile">
                              <FaUserEdit />
                            </button>
                            <button onClick={() => handleResetPassword(u.id)} className="btn btn-sm btn-outline-warning" title="Reset Password">
                              <FaLock />
                            </button>
                            <button onClick={() => handleDeleteUser(u.id)} className="btn btn-sm btn-outline-danger" title="Delete User">
                              <FaTrash />
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

          {/* Create / Edit Overlay Modal */}
          {showModal && (
            <div className="otp-modal-overlay">
              <div className="otp-modal-card" style={{ maxWidth: "550px", textAlign: "left" }}>
                <h4 className="fw-bold mb-3 border-bottom pb-2">
                  {modalMode === "create" ? "Create User Account" : "Edit User Profile"}
                </h4>
                <form onSubmit={handleSubmit}>
                  <div className="row g-2">
                    <div className="col-6">
                      <div className="soc-form-group mb-3">
                        <label className="soc-form-label">Full Name</label>
                        <input
                          type="text"
                          required
                          className="soc-form-control"
                          value={form.fullName}
                          onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="col-6">
                      <div className="soc-form-group mb-3">
                        <label className="soc-form-label">Username</label>
                        <input
                          type="text"
                          required
                          disabled={modalMode === "edit"}
                          className="soc-form-control"
                          value={form.username}
                          onChange={(e) => setForm({ ...form, username: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="row g-2">
                    <div className="col-6">
                      <div className="soc-form-group mb-3">
                        <label className="soc-form-label">Email Address</label>
                        <input
                          type="email"
                          required
                          className="soc-form-control"
                          value={form.email}
                          onChange={(e) => setForm({ ...form, email: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="col-6">
                      <div className="soc-form-group mb-3">
                        <label className="soc-form-label">Phone Number</label>
                        <input
                          type="text"
                          className="soc-form-control"
                          value={form.phone}
                          onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="row g-2">
                    <div className="col-6">
                      <div className="soc-form-group mb-3">
                        <label className="soc-form-label">Department</label>
                        <input
                          type="text"
                          className="soc-form-control"
                          value={form.department}
                          onChange={(e) => setForm({ ...form, department: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="col-6">
                      <div className="soc-form-group mb-3">
                        <label className="soc-form-label">Designated Role</label>
                        <select
                          className="soc-form-control"
                          value={form.role}
                          onChange={(e) => setForm({ ...form, role: e.target.value })}
                        >
                          <option value="EMPLOYEE">Employee</option>
                          <option value="ANALYST">Analyst</option>
                          {modalMode === "edit" && form.role === "ADMIN" && (
                            <option value="ADMIN">Admin</option>
                          )}
                        </select>
                      </div>
                    </div>
                  </div>

                  {form.role === "ANALYST" && (
                    <div className="row g-2 bg-light p-3 rounded mb-3 border">
                      <div className={selectedSpec === "OTHER" ? "col-12" : "col-6"}>
                        <div className="soc-form-group mb-0">
                          <label className="soc-form-label">Specialization</label>
                          <select
                            className="soc-form-control"
                            value={selectedSpec}
                            onChange={(e) => setSelectedSpec(e.target.value)}
                          >
                            <option value="MALWARE">Malware</option>
                            <option value="PHISHING">Phishing</option>
                            <option value="WEB SECURITY">Web Security</option>
                            <option value="NETWORK SECURITY">Network Security</option>
                            <option value="EMAIL SECURITY">Email Security</option>
                            <option value="DATA SECURITY">Data Security</option>
                            <option value="IDENTITY_ACCESS">IDENTITY_ACCESS</option>
                            <option value="ENDPOINT SECURITY">Endpoint Security</option>
                            <option value="THREAT INTELLIGENCE">Threat Intelligence</option>
                            <option value="CLOUD SECURITY">Cloud Security</option>
                            <option value="APPLICATION SECURITY">Application Security</option>
                            <option value="DIGITAL FORENSICS">Digital Forensics</option>
                            <option value="OTHER">Other</option>
                          </select>
                        </div>
                      </div>
                      {selectedSpec === "OTHER" && (
                        <div className="col-12 mt-2">
                          <div className="soc-form-group mb-0">
                            <label className="soc-form-label">Custom Specialization Name</label>
                            <input
                              type="text"
                              required
                              className="soc-form-control"
                              placeholder="e.g. Threat Hunting"
                              value={customSpec}
                              onChange={(e) => setCustomSpec(e.target.value)}
                            />
                          </div>
                        </div>
                      )}
                      <div className="col-6 mt-2">
                        <div className="soc-form-group mb-0">
                          <label className="soc-form-label">Analyst Tier Level</label>
                          <select
                            className="soc-form-control"
                            value={form.analystLevel}
                            onChange={(e) => setForm({ ...form, analystLevel: e.target.value })}
                          >
                            <option value="L1">Level L1</option>
                            <option value="L2">Level L2</option>
                            <option value="L3">Level L3</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="d-flex justify-content-end gap-2 mt-4 pt-2 border-top">
                    <button type="button" onClick={() => setShowModal(false)} className="btn btn-light">
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-soc btn-soc-primary">
                      {modalMode === "create" ? "Create Account" : "Save Settings"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

        </div>
      </div>

      {createdTempPassword && (
        <div className="modal-overlay d-flex align-items-center justify-content-center" style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1100 }}>
          <div className="soc-card p-4 text-center shadow-lg" style={{ maxWidth: "400px", backgroundColor: "#ffffff" }}>
            <h4 className="fw-bold text-success mb-3">🔑 User Account Created</h4>
            <p className="text-secondary" style={{ fontSize: "14px" }}>
              The account has been created immediately. Please copy the temporary password below:
            </p>
            <div className="bg-light p-3 rounded border font-monospace text-center mb-3" style={{ fontSize: "18px", fontWeight: "bold", letterSpacing: "1px" }}>
              {createdTempPassword}
            </div>
            <button 
              onClick={() => {
                navigator.clipboard.writeText(createdTempPassword);
                alert("Password copied to clipboard!");
              }} 
              className="btn btn-primary btn-sm mb-3 me-2"
            >
              Copy Password
            </button>
            <button 
              onClick={() => setCreatedTempPassword("")} 
              className="btn btn-secondary btn-sm mb-3"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserManagement;