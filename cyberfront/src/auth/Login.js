import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { FaLock, FaUser, FaEye, FaEyeSlash, FaShieldAlt } from "react-icons/fa";

function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [form, setForm] = useState({
    username: "",
    password: ""
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  
  // Forgot Password States
  const [forgotOpen, setForgotOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetOtp, setResetOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [forgotStep, setForgotStep] = useState(1); // 1 = enter email, 2 = verify & reset
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState("");
  const [forgotSuccess, setForgotSuccess] = useState("");

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (!form.username || !form.password) {
      setErrorMsg("Please fill in all fields.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(window.API_BASE_URL + "/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.message || "Login failed. Please check credentials.");
        setLoading(false);
        return;
      }

      // Store JWT token
      localStorage.setItem("token", data.token);
      localStorage.setItem("currentUser", JSON.stringify(data));

      login(data);

      const role = (data.role || "").toUpperCase();
      if (role === "EMPLOYEE") {
        navigate("/report");
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      setErrorMsg("Unable to connect to the backend server.");
    } finally {
      setLoading(false);
    }
  };

  // Forgot Password Handlers
  const handleSendResetOtp = async (e) => {
    e.preventDefault();
    setForgotError("");
    setForgotSuccess("");
    if (!resetEmail) {
      setForgotError("Please enter your email.");
      return;
    }

    setForgotLoading(true);
    try {
      const res = await fetch(`${window.API_BASE_URL}/api/auth/forgot-password?email=${resetEmail}`, {
        method: "POST"
      });
      const data = await res.json();
      if (res.ok) {
        setForgotSuccess("OTP sent successfully to " + resetEmail);
        setForgotStep(2);
      } else {
        setForgotError(data.message || "Failed to send reset code.");
      }
    } catch (err) {
      setForgotError("Server connection error.");
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setForgotError("");
    setForgotSuccess("");
    if (!resetOtp || !newPassword) {
      setForgotError("All fields are required.");
      return;
    }

    setForgotLoading(true);
    try {
      const res = await fetch(window.API_BASE_URL + "/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resetEmail, otp: resetOtp, password: newPassword })
      });
      const data = await res.json();
      if (res.ok) {
        setForgotSuccess("Password reset successfully! You can now log in.");
        setTimeout(() => {
          setForgotOpen(false);
          setForgotStep(1);
          setResetEmail("");
          setResetOtp("");
          setNewPassword("");
          setForgotSuccess("");
        }, 2000);
      } else {
        setForgotError(data.message || "Reset failed.");
      }
    } catch (err) {
      setForgotError("Server connection error.");
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="soc-auth-container">
      {/* Visual side panel */}
      <div className="auth-sidebar-panel">
        <div style={{ maxWidth: "450px" }}>
          <div className="d-flex align-items-center gap-2 mb-4" style={{ fontSize: "28px" }}>
            <FaShieldAlt style={{ fontSize: "36px" }} />
            <span className="fw-bold">CyberSOC Portal</span>
          </div>
          <h2 className="text-white fw-bold mb-3" style={{ fontSize: "36px" }}>Enterprise Security Operations</h2>
          <p className="text-light" style={{ fontSize: "16px", lineHeight: "1.6" }}>
            Monitor and respond to real-time security threats. Coordinate team actions, assign priority workflows, and manage compliance SLAs from a single pane of glass.
          </p>
          <div className="mt-5 d-flex gap-4">
            <div>
              <h5 className="text-white mb-1">Workload Auto-Assign</h5>
              <small className="text-light opacity-75">Workload balancing for analysts</small>
            </div>
            <div>
              <h5 className="text-white mb-1">SLA Auto-Escalation</h5>
              <small className="text-light opacity-75">Schedules check and move L2s</small>
            </div>
          </div>
        </div>
      </div>

      {/* Form side panel */}
      <div className="auth-form-panel">
        <div className="auth-form-card">
          <h2 className="auth-title">Welcome back</h2>
          <p className="auth-subtitle">Please enter your credentials to access the SOC.</p>

          {errorMsg && (
            <div className="alert alert-danger py-2" style={{ fontSize: "14px" }}>
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleLoginSubmit}>
            <div className="soc-form-group">
              <label className="soc-form-label">Username</label>
              <div className="position-relative">
                <FaUser className="position-absolute" style={{ left: "16px", top: "16px", color: "#94a3b8" }} />
                <input
                  type="text"
                  className="soc-form-control"
                  style={{ paddingLeft: "45px" }}
                  placeholder="Enter username"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                />
              </div>
            </div>

            <div className="soc-form-group">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <label className="soc-form-label mb-0">Password</label>
                <button
                  type="button"
                  className="btn btn-link p-0 text-decoration-none"
                  style={{ fontSize: "13px", fontWeight: "600", color: "#0d6efd" }}
                  onClick={() => setForgotOpen(true)}
                >
                  Forgot password?
                </button>
              </div>
              <div className="position-relative">
                <FaLock className="position-absolute" style={{ left: "16px", top: "16px", color: "#94a3b8" }} />
                <input
                  type={showPassword ? "text" : "password"}
                  className="soc-form-control"
                  style={{ paddingLeft: "45px", paddingRight: "45px" }}
                  placeholder="Enter password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
                <div
                  className="position-absolute"
                  style={{ right: "16px", top: "14px", cursor: "pointer", color: "#64748b" }}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </div>
              </div>
            </div>

            <div className="d-flex justify-content-between align-items-center mb-4">
              <div className="form-check">
                <input type="checkbox" className="form-check-input" id="rememberMe" />
                <label className="form-check-label text-muted" htmlFor="rememberMe" style={{ fontSize: "14px" }}>
                  Remember me
                </label>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-soc btn-soc-primary w-100 justify-content-center py-2.5"
              disabled={loading}
            >
              {loading ? (
                <div className="spinner-border spinner-border-sm text-light" role="status"></div>
              ) : (
                "Access System"
              )}
            </button>
          </form>

          <p className="mt-4 text-center text-muted" style={{ fontSize: "14px" }}>
            First time user? <Link to="/signup" className="text-decoration-none fw-semibold text-primary">Create account</Link>
          </p>
        </div>
      </div>

      {/* Forgot Password Modal Overlay */}
      {forgotOpen && (
        <div className="otp-modal-overlay">
          <div className="otp-modal-card">
            <h4 className="fw-bold mb-2">Forgot Password</h4>
            <p className="text-muted mb-4" style={{ fontSize: "14px" }}>
              Verify your email via OTP to reset your login password.
            </p>

            {forgotError && <div className="alert alert-danger py-2" style={{ fontSize: "13px" }}>{forgotError}</div>}
            {forgotSuccess && <div className="alert alert-success py-2" style={{ fontSize: "13px" }}>{forgotSuccess}</div>}

            {forgotStep === 1 ? (
              <form onSubmit={handleSendResetOtp}>
                <div className="soc-form-group text-start">
                  <label className="soc-form-label">Registered Email</label>
                  <input
                    type="email"
                    className="soc-form-control"
                    placeholder="name@company.com"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                  />
                </div>
                <div className="d-flex gap-2 justify-content-end mt-4">
                  <button type="button" className="btn btn-light" onClick={() => setForgotOpen(false)}>Cancel</button>
                  <button type="submit" className="btn btn-soc btn-soc-primary" disabled={forgotLoading}>
                    {forgotLoading ? <span className="spinner-border spinner-border-sm"></span> : "Send OTP"}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleResetPassword}>
                <div className="soc-form-group text-start">
                  <label className="soc-form-label">Verification OTP</label>
                  <input
                    type="text"
                    className="soc-form-control"
                    placeholder="Enter 6-digit OTP"
                    value={resetOtp}
                    onChange={(e) => setResetOtp(e.target.value)}
                  />
                </div>
                <div className="soc-form-group text-start">
                  <label className="soc-form-label">New Password</label>
                  <input
                    type="password"
                    className="soc-form-control"
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
                <div className="d-flex gap-2 justify-content-end mt-4">
                  <button type="button" className="btn btn-light" onClick={() => setForgotStep(1)}>Back</button>
                  <button type="submit" className="btn btn-soc btn-soc-primary" disabled={forgotLoading}>
                    {forgotLoading ? <span className="spinner-border spinner-border-sm"></span> : "Reset Password"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Login;