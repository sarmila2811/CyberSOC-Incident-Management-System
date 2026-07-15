import React, { useState } from "react";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import { Link, useNavigate } from "react-router-dom";
import { FaExclamationTriangle, FaPlusCircle, FaPaperclip, FaShieldAlt } from "react-icons/fa";

function ReportIncident() {
  const navigate = useNavigate();
  
  const [form, setForm] = useState({
    title: "",
    category: "PHISHING",
    description: ""
  });
  
  const [customCategory, setCustomCategory] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const submitIncident = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (!form.title || !form.category || !form.description) {
      setErrorMsg("Please fill in all required fields.");
      return;
    }

    if (form.category === "Others" && !customCategory.trim()) {
      setErrorMsg("Please specify the custom threat category.");
      return;
    }

    const currentUser = JSON.parse(localStorage.getItem("currentUser") || "{}");
    const token = localStorage.getItem("token");

    const finalCategory = form.category === "Others" ? customCategory.trim().toUpperCase() : form.category;

    setLoading(true);
    try {
      const res = await fetch(window.API_BASE_URL + "/api/incidents/report", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          title: form.title,
          category: finalCategory,
          customCategory: form.category === "Others" ? customCategory.trim() : null,
          description: form.description,
          reportedBy: currentUser?.username,
        })
      });

      if (res.ok) {
        alert("Security Incident reported successfully. Auto-assigned to matching L1 analyst.");
        setForm({ title: "", category: "PHISHING", description: "" });
        setCustomCategory("");
        navigate("/dashboard");
      } else {
        const data = await res.json();
        setErrorMsg(data.message || "Failed to submit incident.");
      }
    } catch (err) {
      setErrorMsg("Network error contacting security ops backend.");
    } finally {
      setLoading(false);
    }
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
            <span>Report Security Incident</span>
          </div>

          <div className="mb-4">
            <h2 className="m-0 fw-bold">Report Security Incident</h2>
            <p className="text-muted m-0">Submit security alerts or exposures to the SOC team for investigation.</p>
          </div>

          {errorMsg && <div className="alert alert-danger py-2.5 mb-4">{errorMsg}</div>}

          <div className="row g-4">
            <div className="col-lg-8">
              <div className="soc-card shadow-sm">
                <div className="soc-card-title fw-bold mb-3">Incident Reporting Form</div>
                
                <form onSubmit={submitIncident}>
                  <div className="soc-form-group">
                    <label className="soc-form-label">Incident Title</label>
                    <input
                      type="text"
                      className="soc-form-control"
                      placeholder="e.g. Suspicious Phishing Email received in Finance"
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                    />
                  </div>

                  <div className="soc-form-group">
                    <label className="soc-form-label">Exposure Threat Category</label>
                    <select
                      className="soc-form-control"
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}
                    >
                      <option value="PHISHING">Phishing / Social Engineering</option>
                      <option value="MALWARE">Malware Injection / Endpoint Infection</option>
                      <option value="NETWORK">Network Attack / DDoS / Port Scan</option>
                      <option value="RANSOMWARE">Ransomware Encryption Threat</option>
                      <option value="Others">Others</option>
                    </select>
                  </div>

                  {form.category === "Others" && (
                    <div className="soc-form-group">
                      <label className="soc-form-label">Specify Custom Threat Category</label>
                      <input
                        type="text"
                        className="soc-form-control"
                        placeholder="e.g. SQL Injection, Insider Threat, Leak"
                        value={customCategory}
                        onChange={(e) => setCustomCategory(e.target.value)}
                      />
                    </div>
                  )}

                  <div className="soc-form-group">
                    <label className="soc-form-label">Incident Description & Logs</label>
                    <textarea
                      rows="6"
                      className="soc-form-control"
                      placeholder="Describe the anomalies, payload hashes, raw logs, or email headers observed..."
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                    />
                  </div>

                  <button type="submit" className="btn btn-soc btn-soc-primary mt-2" disabled={loading}>
                    {loading ? <span className="spinner-border spinner-border-sm"></span> : "File Incident Report"}
                  </button>
                </form>
              </div>
            </div>

            <div className="col-lg-4">
              <div className="soc-card bg-light shadow-sm">
                <div className="soc-card-title border-0 pb-0">SOC Guidance</div>
                <div className="d-flex flex-column gap-3 mt-3" style={{ fontSize: "14px", lineHeight: "1.5" }}>
                  <div className="d-flex gap-2">
                    <FaShieldAlt className="text-primary mt-1" />
                    <div>
                      <strong>AI Auto-Priority Recommendation</strong>
                      <p className="text-muted m-0 mt-0.5">
                        Your incident priority will be automatically evaluated based on category severity (e.g. Ransomware resolves to Critical).
                      </p>
                    </div>
                  </div>
                  <div className="d-flex gap-2">
                    <FaPlusCircle className="text-success mt-1" />
                    <div>
                      <strong>Workload Balancing Assignment</strong>
                      <p className="text-muted m-0 mt-0.5">
                        The incident is auto-assigned to the active L1 analyst specializing in your selected category who holds the lowest caseload.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ReportIncident;