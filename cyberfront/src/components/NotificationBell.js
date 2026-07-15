import React, { useContext, useState, useEffect, useRef } from "react";
import { NotificationContext } from "../context/NotificationContext";
import { FaBell, FaExternalLinkAlt } from "react-icons/fa";
import { Link } from "react-router-dom";
import { formatTimestamp } from "../utils/format";

function NotificationBell() {
  const { notifications, markAllRead, markAsRead } = useContext(NotificationContext);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleBellClick = () => {
    setOpen(!open);
  };

  const handleNotificationClick = async (id) => {
    if (markAsRead) {
      await markAsRead(id);
    }
  };

  const handleMarkAll = async () => {
    if (markAllRead) {
      await markAllRead();
    }
  };

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  return (
    <div ref={dropdownRef} style={{ position: "relative" }}>
      {/* BELL ICON */}
      <div 
        onClick={handleBellClick} 
        style={{ 
          position: "relative", 
          cursor: "pointer", 
          fontSize: "20px", 
          color: "#475569",
          padding: "4px"
        }}
      >
        <FaBell />
        {unreadCount > 0 && (
          <span
            className="position-absolute translate-middle badge rounded-pill bg-danger d-flex align-items-center justify-content-center"
            style={{
              top: "2px",
              left: "20px",
              fontSize: "10px",
              minWidth: "18px",
              height: "18px",
              padding: "0 4px",
              border: "2px solid #ffffff"
            }}
          >
            {unreadCount}
          </span>
        )}
      </div>

      {/* DROPDOWN */}
      {open && (
        <div
          className="soc-card"
          style={{
            position: "absolute",
            top: "42px",
            right: "0",
            width: "360px",
            maxHeight: "480px",
            overflowY: "hidden",
            zIndex: 1050,
            padding: "0",
            boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
            borderRadius: "8px",
            border: "1px solid #cbd5e1",
            backgroundColor: "#ffffff",
            display: "flex",
            flexDirection: "column"
          }}
        >
          {/* Header */}
          <div 
            className="d-flex justify-content-between align-items-center p-3 border-bottom" 
            style={{ 
              backgroundColor: "#f8fafc", 
              borderTopLeftRadius: "8px", 
              borderTopRightRadius: "8px" 
            }}
          >
            <h6 className="m-0 fw-bold text-dark" style={{ fontSize: "14px" }}>Notifications</h6>
            {unreadCount > 0 && (
              <button 
                onClick={handleMarkAll}
                className="btn btn-sm btn-link text-decoration-none p-0 fw-bold"
                style={{ fontSize: "12px", color: "#0d6efd" }}
              >
                Mark all as read
              </button>
            )}
          </div>
          
          {/* Scrollable list */}
          <div className="d-flex flex-column" style={{ maxHeight: "320px", overflowY: "auto" }}>
            {notifications.length === 0 ? (
              <div className="text-center text-muted py-5" style={{ fontSize: "13.5px" }}>
                <FaBell className="mb-2 opacity-25" style={{ fontSize: "28px" }} />
                <div>No notifications</div>
              </div>
            ) : (
              notifications.slice(0, 10).map((n, i) => (
                <div
                  key={i}
                  onClick={() => handleNotificationClick(n.id)}
                  style={{ 
                    cursor: "pointer", 
                    fontSize: "13px", 
                    padding: "12px 16px",
                    transition: "background-color 0.2s",
                    backgroundColor: n.read ? "#ffffff" : "#f8fafc",
                    borderLeft: n.read ? "4px solid transparent" : "4px solid #0d6efd",
                    borderBottom: "1px solid #e2e8f0"
                  }}
                >
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <span 
                      className="fw-bold text-uppercase" 
                      style={{ 
                        fontSize: "10.5px", 
                        color: n.read ? "#64748b" : "#0f172a", 
                        letterSpacing: "0.5px" 
                      }}
                    >
                      {(n.type || "ALERT").replace(/_/g, " ")}
                    </span>
                    <div className="d-flex align-items-center gap-1.5">
                      {!n.read && (
                        <span 
                          style={{ 
                            width: "7px", 
                            height: "7px", 
                            borderRadius: "50%", 
                            backgroundColor: "#0d6efd", 
                            display: "inline-block" 
                          }} 
                        />
                      )}
                      <span style={{ fontSize: "10.5px", color: "#94a3b8" }}>
                        {formatTimestamp(n.timestamp)}
                      </span>
                    </div>
                  </div>
                  <div className={n.read ? "text-muted" : "text-dark fw-medium"} style={{ fontSize: "12.5px", lineHeight: "1.4" }}>
                    {n.message}
                  </div>
                </div>
              ))
            )}
          </div>
          
          {/* Footer */}
          <div 
            className="p-2 border-top text-center" 
            style={{ 
              backgroundColor: "#f8fafc", 
              borderBottomLeftRadius: "8px", 
              borderBottomRightRadius: "8px" 
            }}
          >
            <Link 
              to="/notifications" 
              onClick={() => setOpen(false)}
              className="btn btn-sm btn-link text-decoration-none fw-bold w-100 d-flex align-items-center justify-content-center gap-1"
              style={{ fontSize: "12.5px", color: "#0d6efd" }}
            >
              <span>View All Notifications</span>
              <FaExternalLinkAlt style={{ fontSize: "10px" }} />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationBell;