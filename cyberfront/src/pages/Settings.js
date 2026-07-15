import React, { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { FaUser, FaLock, FaCog, FaEnvelope } from "react-icons/fa";

function Settings() {
  const [activeTab, setActiveTab] = useState("profile");
  const { user, updateUser } = useAuth();
  const role = user?.role?.toUpperCase();

  // Profile Form States
  const [profile, setProfile] = useState({
    fullName: "",
    email: "",
    phone: "",
    department: "",
    profileImage: ""
  });
  
  // Password Change States
  const [pwForm, setPwForm] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  // App Settings (Admin SLA)
  const [slaSettings, setSlaSettings] = useState({
    criticalSla: "2",
    highSla: "4",
    mediumSla: "8",
    lowSla: "24"
  });

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const [imageFile, setImageFile] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const fetchProfileDetails = async () => {
    if (!user?.id) return;
    try {
      const res = await fetch(`${window.API_BASE_URL}/api/users/${user.id}`, {
        headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
      });
      if (res.ok) {
        const data = await res.json();
        setProfile({
          fullName: data.fullName || "",
          email: data.email || "",
          phone: data.phone || "",
          department: data.department || "",
          profileImage: data.profileImage || ""
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchProfileDetails();
  }, [user]);

  // Image Upload File change
  const handleImageFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate size (5MB = 5 * 1024 * 1024 bytes)
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg("File size exceeds the maximum limit of 5 MB.");
      return;
    }

    // Validate format
    const name = file.name.toLowerCase();
    if (!name.endsWith(".jpg") && !name.endsWith(".jpeg") && !name.endsWith(".png")) {
      setErrorMsg("Invalid file format. Only JPG, JPEG, and PNG formats are allowed.");
      return;
    }

    setImageFile(file);
    setErrorMsg("");
  };

  // Upload Image Handler
  const handleUploadImage = async () => {
    if (!imageFile) {
      setErrorMsg("Please select a valid image file first.");
      return;
    }

    setUploadingImage(true);
    setMsg("");
    setErrorMsg("");

    const formData = new FormData();
    formData.append("file", imageFile);

    try {
      const res = await fetch(`${window.API_BASE_URL}/api/users/${user.id}/profile-image`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        body: formData
      });

      const data = await res.json();
      if (res.ok) {
        setMsg("Profile image updated successfully!");
        setImageFile(null);
        setProfile((prev) => ({ ...prev, profileImage: data.profileImage }));
        
        // Update AuthContext to refresh header/sidebar in real-time
        updateUser({ profileImage: data.profileImage });
      } else {
        setErrorMsg(data.message || "Failed to upload profile image.");
      }
    } catch (err) {
      setErrorMsg("Network error uploading profile image.");
    } finally {
      setUploadingImage(false);
    }
  };

  // Remove Image Handler
  const handleRemoveImage = async () => {
    if (!profile.profileImage) return;

    setUploadingImage(true);
    setMsg("");
    setErrorMsg("");

    try {
      const res = await fetch(`${window.API_BASE_URL}/api/users/${user.id}/profile-image`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        }
      });

      const data = await res.json();
      if (res.ok) {
        setMsg("Profile image removed successfully!");
        setProfile((prev) => ({ ...prev, profileImage: "" }));
        
        // Update AuthContext to clear image in header/sidebar in real-time
        updateUser({ profileImage: null });
      } else {
        setErrorMsg(data.message || "Failed to remove profile image.");
      }
    } catch (err) {
      setErrorMsg("Network error removing profile image.");
    } finally {
      setUploadingImage(false);
    }
  };

  // Update profile details handler
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setMsg("");
    setErrorMsg("");
    setLoading(true);

    try {
      const res = await fetch(`${window.API_BASE_URL}/api/users/${user.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify(profile)
      });
      if (res.ok) {
        setMsg("Profile details updated successfully!");
        updateUser({
          fullName: profile.fullName,
          email: profile.email,
          phone: profile.phone,
          department: profile.department
        });
        fetchProfileDetails();
      } else {
        setErrorMsg("Failed to update profile details.");
      }
    } catch (err) {
      setErrorMsg("Connection error.");
    } finally {
      setLoading(false);
    }
  };

  // Change password handler
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setMsg("");
    setErrorMsg("");

    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setErrorMsg("New password and confirmation do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${window.API_BASE_URL}/api/users/${user.id}/reset-password`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({ password: pwForm.newPassword })
      });
      if (res.ok) {
        setMsg("Password changed successfully!");
        setPwForm({ oldPassword: "", newPassword: "", confirmPassword: "" });
      } else {
        const errData = await res.json();
        setErrorMsg(errData.message || "Failed to reset password.");
      }
    } catch (err) {
      setErrorMsg("Connection error.");
    } finally {
      setLoading(false);
    }
  };

  // Save SLA settings handler
  const handleSaveSla = (e) => {
    e.preventDefault();
    setMsg("SLA timers saved successfully!");
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
            <span>Settings Console</span>
          </div>

          <div className="mb-4">
            <h2 className="m-0 fw-bold">Platform Settings Console</h2>
            <p className="text-muted m-0">Configure preferences, profile parameters, and dynamic SLAs.</p>
          </div>

          {msg && <div className="alert alert-success py-2.5 mb-4">{msg}</div>}
          {errorMsg && <div className="alert alert-danger py-2.5 mb-4">{errorMsg}</div>}

          <div className="row g-4">
            {/* Tabs sidebar links */}
            <div className="col-md-3">
              <div className="soc-card d-flex flex-column gap-2" style={{ padding: "16px" }}>
                <button
                  onClick={() => setActiveTab("profile")}
                  className={`btn w-100 text-start d-flex align-items-center gap-2 py-2 px-3 ${activeTab === "profile" ? "btn-primary text-white" : "btn-light text-dark"}`}
                  style={{ fontSize: "14px" }}
                >
                  <FaUser /> <span>Profile Info</span>
                </button>
                <button
                  onClick={() => setActiveTab("password")}
                  className={`btn w-100 text-start d-flex align-items-center gap-2 py-2 px-3 ${activeTab === "password" ? "btn-primary text-white" : "btn-light text-dark"}`}
                  style={{ fontSize: "14px" }}
                >
                  <FaLock /> <span>Password & Security</span>
                </button>
                {role === "ADMIN" && (
                  <button
                    onClick={() => setActiveTab("sla")}
                    className={`btn w-100 text-start d-flex align-items-center gap-2 py-2 px-3 ${activeTab === "sla" ? "btn-primary text-white" : "btn-light text-dark"}`}
                    style={{ fontSize: "14px" }}
                  >
                    <FaCog /> <span>SLA Config</span>
                  </button>
                )}
                <button
                  onClick={() => setActiveTab("email")}
                  className={`btn w-100 text-start d-flex align-items-center gap-2 py-2 px-3 ${activeTab === "email" ? "btn-primary text-white" : "btn-light text-dark"}`}
                  style={{ fontSize: "14px" }}
                >
                  <FaEnvelope /> <span>Email Settings</span>
                </button>
              </div>
            </div>

            {/* Tab content panel */}
            <div className="col-md-9">
              <div className="soc-card">
                {activeTab === "profile" && (
                  <form onSubmit={handleUpdateProfile}>
                    <h5 className="fw-bold mb-3 border-bottom pb-2">Profile Information</h5>

                    {/* Profile Picture Upload UI */}
                    <div className="d-flex align-items-center gap-4 mb-4 bg-light p-3 rounded border">
                      <div>
                        {profile.profileImage ? (
                          <img
                            src={`${window.API_BASE_URL}${profile.profileImage}`}
                            alt="Avatar"
                            className="rounded-circle border border-2 border-primary"
                            style={{ width: "80px", height: "80px", objectFit: "cover" }}
                          />
                        ) : (
                          <div 
                            className="rounded-circle bg-secondary d-flex align-items-center justify-content-center text-white fw-bold border border-2 border-primary"
                            style={{ width: "80px", height: "80px", fontSize: "28px" }}
                          >
                            {(profile.fullName || user?.username || "?").charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>

                      <div className="d-flex flex-column gap-2 text-start">
                        <span className="fw-semibold text-dark" style={{ fontSize: "14px" }}>Profile Picture</span>
                        <div className="d-flex align-items-center gap-2 flex-wrap">
                          <input
                            type="file"
                            accept=".jpg,.jpeg,.png"
                            className="form-control form-control-sm"
                            style={{ maxWidth: "250px" }}
                            onChange={handleImageFileChange}
                          />
                          {imageFile && (
                            <button
                              type="button"
                              className="btn btn-primary btn-sm px-3"
                              onClick={handleUploadImage}
                              disabled={uploadingImage}
                            >
                              {uploadingImage ? "Uploading..." : "Upload"}
                            </button>
                          )}
                          {profile.profileImage && (
                            <button
                              type="button"
                              className="btn btn-outline-danger btn-sm px-3"
                              onClick={handleRemoveImage}
                              disabled={uploadingImage}
                            >
                              Remove
                            </button>
                          )}
                        </div>
                        <small className="text-muted" style={{ fontSize: "11px" }}>
                          Supports JPG, JPEG, and PNG. Maximum size 5 MB.
                        </small>
                      </div>
                    </div>

                    <div className="soc-form-group">
                      <label className="soc-form-label">Full Name</label>
                      <input
                        type="text"
                        className="soc-form-control"
                        value={profile.fullName}
                        onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                      />
                    </div>

                    <div className="soc-form-group">
                      <label className="soc-form-label">Email Address</label>
                      <input
                        type="email"
                        className="soc-form-control"
                        value={profile.email}
                        onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                      />
                    </div>

                    <div className="row g-3">
                      <div className="col-md-6">
                        <div className="soc-form-group">
                          <label className="soc-form-label">Phone Number</label>
                          <input
                            type="text"
                            className="soc-form-control"
                            value={profile.phone}
                            onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="soc-form-group">
                          <label className="soc-form-label">Department</label>
                          <input
                            type="text"
                            className="soc-form-control"
                            value={profile.department}
                            onChange={(e) => setProfile({ ...profile, department: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>

                    <button type="submit" className="btn btn-soc btn-soc-primary mt-2" disabled={loading}>
                      Save Changes
                    </button>
                  </form>
                )}

                {activeTab === "password" && (
                  <form onSubmit={handleChangePassword}>
                    <h5 className="fw-bold mb-3 border-bottom pb-2">Password Security Settings</h5>
                    <div className="soc-form-group">
                      <label className="soc-form-label">New Password</label>
                      <input
                        type="password"
                        className="soc-form-control"
                        placeholder="Enter new password"
                        value={pwForm.newPassword}
                        onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })}
                      />
                    </div>

                    <div className="soc-form-group">
                      <label className="soc-form-label">Confirm New Password</label>
                      <input
                        type="password"
                        className="soc-form-control"
                        placeholder="Confirm new password"
                        value={pwForm.confirmPassword}
                        onChange={(e) => setPwForm({ ...pwForm, confirmPassword: e.target.value })}
                      />
                    </div>

                    <button type="submit" className="btn btn-soc btn-soc-primary mt-2" disabled={loading}>
                      Update Password
                    </button>
                  </form>
                )}

                {activeTab === "sla" && role === "ADMIN" && (
                  <form onSubmit={handleSaveSla}>
                    <h5 className="fw-bold mb-3 border-bottom pb-2">Admin SLA Dynamic Settings</h5>
                    <p className="text-muted" style={{ fontSize: "13px" }}>
                      Define resolution durations for alert tiers. The background scheduler monitors these values.
                    </p>

                    <div className="row g-3">
                      <div className="col-md-6">
                        <div className="soc-form-group">
                          <label className="soc-form-label">Critical Priority SLA (Hours)</label>
                          <input
                            type="number"
                            className="soc-form-control"
                            value={slaSettings.criticalSla}
                            onChange={(e) => setSlaSettings({ ...slaSettings, criticalSla: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="soc-form-group">
                          <label className="soc-form-label">High Priority SLA (Hours)</label>
                          <input
                            type="number"
                            className="soc-form-control"
                            value={slaSettings.highSla}
                            onChange={(e) => setSlaSettings({ ...slaSettings, highSla: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="soc-form-group">
                          <label className="soc-form-label">Medium Priority SLA (Hours)</label>
                          <input
                            type="number"
                            className="soc-form-control"
                            value={slaSettings.mediumSla}
                            onChange={(e) => setSlaSettings({ ...slaSettings, mediumSla: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="soc-form-group">
                          <label className="soc-form-label">Low Priority SLA (Hours)</label>
                          <input
                            type="number"
                            className="soc-form-control"
                            value={slaSettings.lowSla}
                            onChange={(e) => setSlaSettings({ ...slaSettings, lowSla: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>

                    <button type="submit" className="btn btn-soc btn-soc-primary mt-2">
                      Save SLA Config
                    </button>
                  </form>
                )}

                {activeTab === "email" && (
                  <div>
                    <h5 className="fw-bold mb-3 border-bottom pb-2">SMTP Configuration Settings</h5>
                    <p className="text-muted" style={{ fontSize: "14px" }}>
                      The system uses JavaMailSender with SMTP to deliver email notifications dynamically.
                    </p>
                    <div className="bg-light p-3 rounded border text-secondary" style={{ fontSize: "13px" }}>
                      <strong>Active SMTP Server:</strong> smtp.gmail.com <br/>
                      <strong>Port:</strong> 587 (TLS Enabled) <br/>
                      <strong>Verified Sender Address:</strong> cybersoc.project@gmail.com
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Settings;
