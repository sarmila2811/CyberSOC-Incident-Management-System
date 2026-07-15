import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaShieldAlt, FaLock } from "react-icons/fa";

export default function ChangePassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const navigate = useNavigate();

  const isPasswordSecure = (pw) => {
    if (!pw || pw.length < 8) return false;
    const hasUpper = /[A-Z]/.test(pw);
    const hasLower = /[a-z]/.test(pw);
    const hasDigit = /[0-9]/.test(pw);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(pw);
    return hasUpper && hasLower && hasDigit && hasSpecial;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (!password) {
      setErrorMsg("Please enter a new password.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    if (!isPasswordSecure(password)) {
      setErrorMsg("Password must be at least 8 characters long and contain uppercase, lowercase, numbers, and special characters (!@#$%^&*).");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(window.API_BASE_URL + "/api/users/change-password", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({ password })
      });

      if (res.ok) {
        // Update local storage user state
        const storedUser = JSON.parse(localStorage.getItem("currentUser") || "{}");
        storedUser.forcePasswordChange = false;
        localStorage.setItem("currentUser", JSON.stringify(storedUser));
        
        alert("Password updated successfully! Welcome to your dashboard.");
        
        // Force refresh page and route to dashboard
        window.location.href = "/dashboard";
      } else {
        const data = await res.json();
        setErrorMsg(data.message || "Failed to update password.");
      }
    } catch (err) {
      setErrorMsg("Connection to server failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="soc-auth-container">
      {/* Side panel */}
      <div className="auth-sidebar-panel">
        <div style={{ maxWidth: "450px" }}>
          <div className="d-flex align-items-center gap-2 mb-4" style={{ fontSize: "28px" }}>
            <FaShieldAlt style={{ fontSize: "36px" }} />
            <span className="fw-bold">CyberSOC Portal</span>
          </div>
          <h2 className="text-white fw-bold mb-3" style={{ fontSize: "36px" }}>Security Setup</h2>
          <p className="text-light" style={{ fontSize: "16px", lineHeight: "1.6" }}>
            A temporary password was assigned to your account. You must set a new secure password to access the platform.
          </p>
        </div>
      </div>

      {/* Form panel */}
      <div className="auth-form-panel">
        <div className="auth-form-card">
          <h2 className="auth-title">🔒 Change Password</h2>
          <p className="auth-subtitle">Establish your custom secure credentials.</p>

          {errorMsg && (
            <div className="alert alert-danger py-2" style={{ fontSize: "13.5px" }}>
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="soc-form-group mb-3">
              <label className="soc-form-label">New Password</label>
              <div className="position-relative">
                <FaLock className="position-absolute" style={{ left: "16px", top: "16px", color: "#94a3b8" }} />
                <input
                  type="password"
                  required
                  className="soc-form-control"
                  style={{ paddingLeft: "45px" }}
                  placeholder="Enter secure password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <div className="soc-form-group mb-4">
              <label className="soc-form-label">Confirm New Password</label>
              <div className="position-relative">
                <FaLock className="position-absolute" style={{ left: "16px", top: "16px", color: "#94a3b8" }} />
                <input
                  type="password"
                  required
                  className="soc-form-control"
                  style={{ paddingLeft: "45px" }}
                  placeholder="Repeat secure password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-soc btn-soc-primary w-100 justify-content-center py-2.5"
              disabled={loading}
            >
              {loading ? <span className="spinner-border spinner-border-sm"></span> : "Update Credentials & Access"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
