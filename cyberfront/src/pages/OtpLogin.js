import React, { useState } from "react";
import { sendOtp, verifyOtp } from "../services/authService";
import { useNavigate, Link } from "react-router-dom";
import { FaShieldAlt, FaEnvelope, FaLock } from "react-icons/fa";

export default function OtpLogin() {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [timeLeft, setTimeLeft] = useState(60);
  const [timerActive, setTimerActive] = useState(false);

  const navigate = useNavigate();

  // TIMER EFFECT
  React.useEffect(() => {
    let interval = null;
    if (timerActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      clearInterval(interval);
      setTimerActive(false);
      setErrorMsg("OTP Expired");
    }
    return () => clearInterval(interval);
  }, [timerActive, timeLeft]);

  // SEND OTP
  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!email) {
      setErrorMsg("Please enter your email.");
      return;
    }
    setErrorMsg("");
    setLoading(true);
    try {
      await sendOtp(email);
      localStorage.setItem("email", email);
      alert("OTP Sent Successfully to " + email);
      setStep(2);
      setTimeLeft(60);
      setTimerActive(true);
      setErrorMsg("");
    } catch (err) {
      setErrorMsg("Error sending OTP. Please check email address.");
    } finally {
      setLoading(false);
    }
  };

  // RESEND OTP
  const handleResendOtp = async (e) => {
    e?.preventDefault();
    setErrorMsg("");
    setLoading(true);
    setOtp("");
    try {
      const storedEmail = localStorage.getItem("email") || email;
      await sendOtp(storedEmail);
      alert("A fresh OTP has been sent successfully to " + storedEmail);
      setTimeLeft(60);
      setTimerActive(true);
      setErrorMsg("");
    } catch (err) {
      setErrorMsg("Error resending OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // VERIFY OTP
  const handleVerify = async (e) => {
    e.preventDefault();
    if (!otp) {
      setErrorMsg("Please enter the code.");
      return;
    }
    setErrorMsg("");
    setLoading(true);
    try {
      const storedEmail = localStorage.getItem("email");
      await verifyOtp(storedEmail, otp);
      
      alert("OTP Verified Successfully");
      
      // Navigate to dashboard as default after verify
      navigate("/dashboard");
    } catch (err) {
      setErrorMsg("Invalid or expired OTP code.");
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
          <h2 className="text-white fw-bold mb-3" style={{ fontSize: "36px" }}>OTP Credentials</h2>
          <p className="text-light" style={{ fontSize: "16px", lineHeight: "1.6" }}>
            Access the system securely using email-based OTP credentials without password prompts.
          </p>
        </div>
      </div>

      {/* Form panel */}
      <div className="auth-form-panel">
        <div className="auth-form-card">
          <h2 className="auth-title">🔐 OTP Log In</h2>
          <p className="auth-subtitle">Verify your email to generate session access.</p>

          {errorMsg && (
            <div className="alert alert-danger py-2" style={{ fontSize: "14px" }}>
              {errorMsg}
            </div>
          )}

          {step === 1 ? (
            <form onSubmit={handleSendOtp}>
              <div className="soc-form-group mb-4">
                <label className="soc-form-label">Email Address</label>
                <div className="position-relative">
                  <FaEnvelope className="position-absolute" style={{ left: "16px", top: "16px", color: "#94a3b8" }} />
                  <input
                    type="email"
                    className="soc-form-control"
                    style={{ paddingLeft: "45px" }}
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-soc btn-soc-primary w-100 justify-content-center py-2.5"
                disabled={loading}
              >
                {loading ? <span className="spinner-border spinner-border-sm"></span> : "Send Verification OTP"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerify}>
              <div className="soc-form-group mb-2">
                <label className="soc-form-label">One-Time Password (OTP)</label>
                <div className="position-relative">
                  <FaLock className="position-absolute" style={{ left: "16px", top: "16px", color: "#94a3b8" }} />
                  <input
                    type="text"
                    className="soc-form-control"
                    style={{ paddingLeft: "45px" }}
                    placeholder="Enter 6-digit OTP code"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    disabled={timeLeft === 0}
                  />
                </div>
              </div>

              <div className="mb-4 text-start">
                {timeLeft > 0 ? (
                  <span className="text-secondary fw-semibold" style={{ fontSize: "13px" }}>
                    Code expires in: <strong className="text-primary">{timeLeft} seconds</strong>
                  </span>
                ) : (
                  <span className="text-danger fw-semibold" style={{ fontSize: "13px" }}>
                    OTP Expired. Please request a new code.
                  </span>
                )}
              </div>

              <button
                type="submit"
                className="btn btn-soc btn-soc-primary w-100 justify-content-center py-2.5 mb-3"
                disabled={loading || timeLeft === 0}
              >
                {loading ? <span className="spinner-border spinner-border-sm"></span> : "Verify & Access"}
              </button>

              {timeLeft === 0 && (
                <button
                  type="button"
                  onClick={handleResendOtp}
                  className="btn btn-success w-100 py-2.5 mb-3 fw-bold"
                  disabled={loading}
                >
                  {loading ? <span className="spinner-border spinner-border-sm"></span> : "🔄 Resend OTP Code"}
                </button>
              )}

              <button 
                type="button" 
                onClick={() => { setStep(1); setTimerActive(false); }} 
                className="btn btn-light w-100 py-2.5"
                disabled={loading}
              >
                Back to email input
              </button>
            </form>
          )}

          <p className="mt-4 text-center text-muted" style={{ fontSize: "14px" }}>
            Return to <Link to="/login" className="text-decoration-none fw-semibold text-primary">Standard Login</Link>
          </p>
        </div>
      </div>
    </div>
  );
}