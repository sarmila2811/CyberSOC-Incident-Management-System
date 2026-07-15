import React, { useContext, useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import { Link } from "react-router-dom";
import { NotificationContext } from "../context/NotificationContext";
import { FaTrash, FaCheck, FaBell, FaSearch, FaRegEnvelopeOpen } from "react-icons/fa";

function Notifications() {
  const { notifications, setNotifications, markAllRead, markAsRead } = useContext(NotificationContext);
  const [search, setSearch] = useState("");
  const [readFilter, setReadFilter] = useState(""); // all, read, unread

  useEffect(() => {
    if (markAllRead) {
      markAllRead();
    }
  }, [markAllRead]);

  const handleMarkRead = async (id) => {
    if (markAsRead) {
      await markAsRead(id);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this notification?")) return;
    try {
      const res = await fetch(`http://localhost:8080/api/notifications/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
      });
      if (res.ok) {
        setNotifications(prev => prev.filter(n => n.id !== id));
      }
    } catch (err) {
      alert("Error deleting notification");
    }
  };

  const filtered = notifications.filter(n => {
    const q = search.toLowerCase();
    const matchSearch = !search || 
      (n.message || "").toLowerCase().includes(q) ||
      (n.type || "").toLowerCase().includes(q);

    let matchRead = true;
    if (readFilter === "unread" && n.read) matchRead = false;
    if (readFilter === "read" && !n.read) matchRead = false;

    return matchSearch && matchRead;
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="app-wrapper">
      <Navbar />
      <div className="page-container">
        <Sidebar />
        <div className="main-content">
          <div className="soc-breadcrumb">
            <Link to="/dashboard">Home</Link>
            <span>/</span>
            <span>Notification Center</span>
          </div>

          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h2 className="m-0 fw-bold">Notification Center</h2>
              <p className="text-muted m-0">Live warnings, assignments, SLA updates, and account logs.</p>
            </div>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="btn btn-soc btn-soc-primary">
                <FaCheck /> Mark All Read
              </button>
            )}
          </div>

          {/* Filters panel */}
          <div className="soc-card mb-4" style={{ padding: "16px" }}>
            <div className="row g-2 align-items-center">
              <div className="col-lg-5">
                <div style={{ display: "flex", alignItems: "center", gap: "8px", width: "100%" }}>
                  <label style={{ margin: 0, fontWeight: "bold", color: "#475569", fontSize: "14px", whiteSpace: "nowrap", display: "inline-block" }}>Search:</label>
                  <div style={{ flexGrow: 1, position: "relative" }}>
                    <FaSearch className="position-absolute" style={{ left: "12px", top: "12px", color: "#94a3b8" }} />
                    <input
                      type="text"
                      className="soc-form-control py-2"
                      style={{ paddingLeft: "36px" }}
                      placeholder="Search notifications..."
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
                  value={readFilter}
                  onChange={(e) => setReadFilter(e.target.value)}
                >
                  <option value="">Status: All</option>
                  <option value="unread">Unread</option>
                  <option value="read">Read</option>
                </select>
              </div>
            </div>
          </div>

          <div className="soc-card">
            <div className="d-flex flex-column gap-3">
              {filtered.length === 0 ? (
                <div className="text-center py-5 text-muted">
                  <FaRegEnvelopeOpen style={{ fontSize: "48px", color: "#cbd5e1" }} />
                  <p className="mt-3 m-0" style={{ fontSize: "15px" }}>No notifications match the filter.</p>
                </div>
              ) : (
                filtered.map((n, idx) => (
                  <div 
                    key={idx} 
                    className="p-3 rounded border d-flex justify-content-between align-items-center"
                    style={{ 
                      transition: "var(--soc-transition)",
                      backgroundColor: n.read ? "#ffffff" : "#f0f7ff",
                      borderLeft: n.read ? "1px solid #e2e8f0" : "4px solid #0d6efd"
                    }}
                  >
                    <div className="d-flex align-items-center gap-3">
                      <div className={`kpi-icon-wrapper ${
                        n.type === 'SLA_VIOLATED' || n.type === 'REJECTED' ? 'bg-danger-subtle text-danger' :
                        n.type === 'ASSIGNED' ? 'bg-primary-subtle text-primary' : 'bg-secondary'
                      }`} style={{ width: "36px", height: "36px", fontSize: "16px" }}>
                        <FaBell />
                      </div>
                      <div>
                        <div className="d-flex align-items-center gap-2">
                          <span className="fw-bold" style={{ fontSize: "14px" }}>{n.type}</span>
                          <small className="text-muted" style={{ fontSize: "11px" }}>{n.timestamp}</small>
                        </div>
                        <p className="m-0 mt-1 text-dark" style={{ fontSize: "14px" }}>{n.message}</p>
                      </div>
                    </div>

                    <div className="d-flex gap-2">
                      {!n.read && (
                        <button 
                          onClick={() => handleMarkRead(n.id)}
                          className="btn btn-sm btn-outline-success"
                          title="Mark Read"
                        >
                          <FaCheck />
                        </button>
                      )}
                      <button 
                        onClick={() => handleDelete(n.id)}
                        className="btn btn-sm btn-outline-danger"
                        title="Delete"
                      >
                        <FaTrash />
                      </button>
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

export default Notifications;
