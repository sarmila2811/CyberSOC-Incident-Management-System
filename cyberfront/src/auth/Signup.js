import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { FaShieldAlt, FaUser, FaEnvelope, FaLock, FaPhone, FaBuilding, FaEye, FaEyeSlash } from "react-icons/fa";

function Signup() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    username: "",
    fullName: "",
    email: "",
    phone: "",
    department: "Human Resources (HR)",
    password: "",
    confirmPassword: "",
    role: "EMPLOYEE",
    analystLevel: "L1",
    specialization: "Malware"
  });

  const [customDept, setCustomDept] = useState("");
  const [customSpec, setCustomSpec] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Password Policy States
  const [policy, setPolicy] = useState({
    minLength: false,
    hasUpper: false,
    hasLower: false,
    hasNumber: false,
    hasSpecial: false
  });

  const [passwordMatch, setPasswordMatch] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  // OTP Verification Overlay States
  const [otpOpen, setOtpOpen] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [countdown, setCountdown] = useState(60);

  // Password constraint check in real time
  useEffect(() => {
    const pw = form.password;
    setPolicy({
      minLength: pw.length >= 8,
      hasUpper: /[A-Z]/.test(pw),
      hasLower: /[a-z]/.test(pw),
      hasNumber: /[0-9]/.test(pw),
      hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(pw)
    });
  }, [form.password]);

  useEffect(() => {
    setPasswordMatch(form.password !== "" && form.password === form.confirmPassword);
  }, [form.password, form.confirmPassword]);

  // Timer for OTP resend countdown
  useEffect(() => {
    let timer;
    if (otpOpen && countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [otpOpen, countdown]);

  const isPasswordValid = policy.minLength && policy.hasUpper && policy.hasLower && policy.hasNumber && policy.hasSpecial;
  
  const isDeptValid = form.department !== "Others" || customDept.trim() !== "";
  const isSpecValid = form.role !== "ANALYST" || form.specialization !== "Others" || customSpec.trim() !== "";

  const isFormValid = 
    form.username.trim() !== "" && 
    form.fullName.trim() !== "" && 
    form.email.trim() !== "" && 
    form.phone.trim() !== "" && 
    form.department.trim() !== "" && 
    isDeptValid &&
    isSpecValid &&
    isPasswordValid && 
    passwordMatch;

  const handleRoleChange = (e) => {
    const selectedRole = e.target.value;
    setForm({
      ...form,
      role: selectedRole,
      department: selectedRole === "EMPLOYEE" ? "Human Resources (HR)" : "Security Operations Center",
      analystLevel: selectedRole === "ANALYST" ? "L1" : "",
      specialization: selectedRole === "ANALYST" ? "Malware" : ""
    });
    setCustomDept("");
    setCustomSpec("");
  };

  // STEP 1: Send OTP on registration submit
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (!isFormValid) {
      setErrorMsg("Please satisfy all fields and password security policies.");
      return;
    }

    setLoading(true);
    try {
      // Send OTP to email first
      const res = await fetch(`http://localhost:8080/api/auth/send-otp?email=${form.email}`, {
        method: "POST"
      });
      const data = await res.json();

      if (res.ok) {
        setOtpOpen(true);
        setCountdown(60);
      } else {
        setErrorMsg(data.message || "Failed to initiate verification OTP email.");
      }
    } catch (err) {
      setErrorMsg("Network error contacting the authentication service.");
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (countdown > 0) return;
    setOtpError("");
    setOtpLoading(true);
    try {
      const res = await fetch(`http://localhost:8080/api/auth/send-otp?email=${form.email}`, {
        method: "POST"
      });
      if (res.ok) {
        setCountdown(60);
        setOtpError("");
      } else {
        setOtpError("Failed to resend code.");
      }
    } catch (err) {
      setOtpError("Network error.");
    } finally {
      setOtpLoading(false);
    }
  };

  // STEP 2: Verify OTP and save User account in MySQL
  const handleVerifyAndCreateAccount = async (e) => {
    e.preventDefault();
    setOtpError("");

    if (!otpCode) {
      setOtpError("Please enter the verification OTP code.");
      return;
    }

    setOtpLoading(true);
    try {
      // 1. Verify OTP
      const resVerify = await fetch(`http://localhost:8080/api/auth/verify-otp?email=${form.email}&otp=${otpCode}`, {
        method: "POST"
      });
      const verifyData = await resVerify.json();

      if (!resVerify.ok) {
        setOtpError(verifyData.message || "Verification code is invalid or expired.");
        setOtpLoading(false);
        return;
      }

      // 2. Verified! Save user in database
      const finalDept = form.department === "Others" ? customDept : form.department;
      const finalSpec = form.role === "ANALYST" && form.specialization === "Others" ? customSpec : form.specialization;

      const resSignup = await fetch("http://localhost:8080/api/users/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: form.username,
          fullName: form.fullName,
          email: form.email,
          phone: form.phone,
          department: finalDept,
          password: form.password,
          role: form.role,
          analystLevel: form.role === "ANALYST" ? form.analystLevel : null,
          specialization: form.role === "ANALYST" ? finalSpec : null
        })
      });

      const signupData = await resSignup.json();

      if (resSignup.ok) {
        alert("Account registered successfully! Please log in.");
        setOtpOpen(false);
        navigate("/login");
      } else {
        setOtpError(signupData.message || "Account creation failed after verification.");
      }
    } catch (err) {
      setOtpError("Server connection error during registry creation.");
    } finally {
      setOtpLoading(false);
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
          <h2 className="text-white fw-bold mb-3" style={{ fontSize: "36px" }}>Register Account</h2>
          <p className="text-light" style={{ fontSize: "16px", lineHeight: "1.6" }}>
            Join the enterprise security operations network. Registering creates your profile permanently in the secure database. You must verify your email address to log in.
          </p>
        </div>
      </div>

      {/* Form panel */}
      <div className="auth-form-panel">
        <div className="auth-form-card my-auto" style={{ maxHeight: "95vh", overflowY: "auto", padding: "10px" }}>
          <h2 className="auth-title">Create Account</h2>
          <p className="auth-subtitle">Verify your identity to join the SOC team.</p>

          {errorMsg && (
            <div className="alert alert-danger py-2" style={{ fontSize: "14px" }}>
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleRegisterSubmit}>
            {/* Designated Role Select */}
            <div className="soc-form-group mb-3">
              <label className="soc-form-label">Designated Role</label>
              <select
                className="soc-form-control"
                value={form.role}
                onChange={handleRoleChange}
              >
                <option value="EMPLOYEE">Employee</option>
                <option value="ANALYST">Analyst</option>
              </select>
            </div>

            {/* Common fields: Full Name & Username */}
            <div className="row g-2">
              <div className="col-6">
                <div className="soc-form-group mb-3">
                  <label className="soc-form-label">Full Name</label>
                  <input
                    type="text"
                    required
                    className="soc-form-control"
                    placeholder="John Doe"
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
                    className="soc-form-control"
                    placeholder="johndoe"
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Email & Phone Number */}
            <div className="row g-2">
              <div className="col-6">
                <div className="soc-form-group mb-3">
                  <label className="soc-form-label">Email Address</label>
                  <div className="position-relative">
                    <FaEnvelope className="position-absolute" style={{ left: "16px", top: "16px", color: "#94a3b8" }} />
                    <input
                      type="email"
                      required
                      className="soc-form-control"
                      style={{ paddingLeft: "45px" }}
                      placeholder="name@company.com"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <div className="col-6">
                <div className="soc-form-group mb-3">
                  <label className="soc-form-label">Phone Number</label>
                  <div className="position-relative">
                    <FaPhone className="position-absolute" style={{ left: "16px", top: "16px", color: "#94a3b8" }} />
                    <input
                      type="text"
                      required
                      className="soc-form-control"
                      style={{ paddingLeft: "45px" }}
                      placeholder="+1 555-0199"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Role specific Department dropdowns */}
            <div className="row g-2">
              <div className="col-12">
                <div className="soc-form-group mb-3">
                  <label className="soc-form-label">Department</label>
                  {form.role === "EMPLOYEE" ? (
                    <select
                      className="soc-form-control"
                      value={form.department}
                      onChange={(e) => setForm({ ...form, department: e.target.value })}
                    >
                      <option value="Human Resources (HR)">Human Resources (HR)</option>
                      <option value="Information Technology (IT)">Information Technology (IT)</option>
                      <option value="Finance">Finance</option>
                      <option value="Development">Development</option>
                      <option value="Network Team">Network Team</option>
                      <option value="Operations">Operations</option>
                      <option value="Sales">Sales</option>
                      <option value="Marketing">Marketing</option>
                      <option value="Customer Support">Customer Support</option>
                      <option value="Administration">Administration</option>
                      <option value="Others">Others</option>
                    </select>
                  ) : (
                    <select
                      className="soc-form-control"
                      value={form.department}
                      onChange={(e) => setForm({ ...form, department: e.target.value })}
                    >
                      <option value="Security Operations Center">Security Operations Center</option>
                      <option value="Threat Intelligence">Threat Intelligence</option>
                      <option value="Incident Response">Incident Response</option>
                      <option value="Digital Forensics">Digital Forensics</option>
                      <option value="Security Engineering">Security Engineering</option>
                      <option value="Others">Others</option>
                    </select>
                  )}
                </div>
              </div>
            </div>

            {/* Custom Department text field */}
            {form.department === "Others" && (
              <div className="soc-form-group mb-3">
                <label className="soc-form-label">Enter Department</label>
                <div className="position-relative">
                  <FaBuilding className="position-absolute" style={{ left: "16px", top: "16px", color: "#94a3b8" }} />
                  <input
                    type="text"
                    required
                    className="soc-form-control"
                    style={{ paddingLeft: "45px" }}
                    placeholder="Enter custom department"
                    value={customDept}
                    onChange={(e) => setCustomDept(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* Analyst Level & Specialization options */}
            {form.role === "ANALYST" && (
              <>
                <div className="row g-2">
                  <div className="col-6">
                    <div className="soc-form-group mb-3">
                      <label className="soc-form-label">Analyst Level</label>
                      <select
                        className="soc-form-control"
                        value={form.analystLevel}
                        onChange={(e) => setForm({ ...form, analystLevel: e.target.value })}
                      >
                        <option value="L1">L1 - Junior Analyst</option>
                        <option value="L2">L2 - Senior Analyst</option>
                        <option value="L3">L3 - Expert Analyst</option>
                      </select>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="soc-form-group mb-3">
                      <label className="soc-form-label">Specialization</label>
                      <select
                        className="soc-form-control"
                        value={form.specialization}
                        onChange={(e) => setForm({ ...form, specialization: e.target.value })}
                      >
                        <option value="Malware">Malware</option>
                        <option value="Phishing">Phishing</option>
                        <option value="Ransomware">Ransomware</option>
                        <option value="Network Security">Network Security</option>
                        <option value="Cloud Security">Cloud Security</option>
                        <option value="Endpoint Security">Endpoint Security</option>
                        <option value="Web Attack">Web Attack</option>
                        <option value="Digital Forensics">Digital Forensics</option>
                        <option value="Vulnerability Management">Vulnerability Management</option>
                        <option value="Insider Threat">Insider Threat</option>
                        <option value="Others">Others</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Custom Specialization text field */}
                {form.specialization === "Others" && (
                  <div className="soc-form-group mb-3">
                    <label className="soc-form-label">Enter Specialization</label>
                    <input
                      type="text"
                      required
                      className="soc-form-control"
                      placeholder="Enter custom specialization"
                      value={customSpec}
                      onChange={(e) => setCustomSpec(e.target.value)}
                    />
                  </div>
                )}
              </>
            )}

            {/* Passwords with show/hide toggles */}
            <div className="row g-2">
              <div className="col-6">
                <div className="soc-form-group mb-2">
                  <label className="soc-form-label">Password</label>
                  <div className="position-relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      className="soc-form-control"
                      style={{ paddingRight: "45px" }}
                      placeholder="Password"
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                    />
                    <div
                      className="position-absolute"
                      style={{ right: "16px", top: "14px", cursor: "pointer", color: "#64748b", zIndex: 10 }}
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <FaEyeSlash /> : <FaEye />}
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-6">
                <div className="soc-form-group mb-2">
                  <label className="soc-form-label">Confirm</label>
                  <div className="position-relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      className="soc-form-control"
                      style={{ paddingRight: "45px" }}
                      placeholder="Confirm"
                      value={form.confirmPassword}
                      onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                    />
                    <div
                      className="position-absolute"
                      style={{ right: "16px", top: "14px", cursor: "pointer", color: "#64748b", zIndex: 10 }}
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Real-time policy requirements list */}
            <ul className="password-policy-list mb-3">
              <li className={policy.minLength ? "policy-valid" : "policy-invalid"}>
                {policy.minLength ? "✓" : "✗"} Minimum 8 characters
              </li>
              <li className={policy.hasUpper ? "policy-valid" : "policy-invalid"}>
                {policy.hasUpper ? "✓" : "✗"} At least one uppercase letter
              </li>
              <li className={policy.hasLower ? "policy-valid" : "policy-invalid"}>
                {policy.hasLower ? "✓" : "✗"} At least one lowercase letter
              </li>
              <li className={policy.hasNumber ? "policy-valid" : "policy-invalid"}>
                {policy.hasNumber ? "✓" : "✗"} At least one number
              </li>
              <li className={policy.hasSpecial ? "policy-valid" : "policy-invalid"}>
                {policy.hasSpecial ? "✓" : "✗"} At least one special character (e.g. @, #)
              </li>
              <li className={passwordMatch ? "policy-valid" : "policy-invalid"}>
                {passwordMatch ? "✓" : "✗"} Passwords match
              </li>
            </ul>

            <button
              type="submit"
              className="btn btn-soc btn-soc-primary w-100 justify-content-center py-2.5"
              disabled={!isFormValid || loading}
            >
              {loading ? <span className="spinner-border spinner-border-sm"></span> : "Register & Send OTP"}
            </button>
          </form>

          <p className="mt-3 text-center text-muted" style={{ fontSize: "14px" }}>
            Already have an account? <Link to="/login" className="text-decoration-none fw-semibold text-primary">Sign in</Link>
          </p>
        </div>
      </div>

      {/* OTP Verification Modal Overlay */}
      {otpOpen && (
        <div className="otp-modal-overlay">
          <div className="otp-modal-card">
            <h4 className="fw-bold mb-2">Verify Email Address</h4>
            <p className="text-muted mb-4" style={{ fontSize: "14px" }}>
              We've sent a 6-digit OTP verification code to <strong>{form.email}</strong>.
            </p>

            {otpError && (
              <div className="alert alert-danger py-2 mb-3" style={{ fontSize: "13px" }}>
                {otpError}
              </div>
            )}

            <form onSubmit={handleVerifyAndCreateAccount}>
              <div className="soc-form-group mb-4">
                <input
                  type="text"
                  className="soc-form-control text-center fw-bold fs-4"
                  placeholder="0 0 0 0 0 0"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ""))}
                />
              </div>

              <button
                type="submit"
                className="btn btn-soc btn-soc-primary w-100 justify-content-center py-2.5 mb-3"
                disabled={otpLoading}
              >
                {otpLoading ? <span className="spinner-border spinner-border-sm"></span> : "Verify & Complete Signup"}
              </button>

              <div className="text-center">
                {countdown > 0 ? (
                  <span className="text-muted" style={{ fontSize: "13px" }}>
                    Resend code in {countdown}s
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    className="btn btn-link text-decoration-none p-0 fw-semibold text-primary"
                    style={{ fontSize: "13px" }}
                    disabled={otpLoading}
                  >
                    Resend verification code
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Signup;