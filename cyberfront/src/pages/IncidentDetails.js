import React, { useEffect, useState, useRef, useContext } from "react";
import { useParams, Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import BackButton from "../components/BackButton";
import { 
  FaClock, FaUser, FaHistory, FaCheck, FaTimes, 
  FaFileAlt, FaFileUpload, FaArrowUp, 
   FaExclamationTriangle, FaCheckCircle, FaListUl,
   FaShieldAlt, FaBriefcase, FaInfoCircle,
  FaGlobe, FaLink, FaTerminal, FaDesktop, FaKey, FaFileCode, FaHashtag,
  FaEnvelope
} from "react-icons/fa";
import { 
  formatIncidentId, 
  formatTimestamp, 
  formatSpecialization,
  extractIoCs,
  getMitreMapping,
  getDefaultChecklistForCategory,
  getAnalystLevel
} from "../utils/format";
import { NotificationContext } from "../context/NotificationContext";

function ClickableIoc({ value }) {
  const [showMenu, setShowMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  
  if (!value) return null;

  const handleCopy = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
      setShowMenu(false);
    }, 1500);
  };

  return (
    <div className="position-relative d-inline-block" style={{ maxWidth: "100%" }}>
      <span 
        onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }} 
        style={{ cursor: "pointer", textDecoration: "underline dotted" }}
        className="text-primary fw-bold d-block text-truncate"
        title="Click to interact"
      >
        {value}
      </span>
      {showMenu && (
        <div 
          className="position-absolute bg-white border rounded shadow p-1.5 text-start"
          style={{ zIndex: 1000, top: "22px", left: "0", minWidth: "180px", fontSize: "12px" }}
        >
          <a
            href={`/incidents?search=${encodeURIComponent(value)}`}
            className="dropdown-item py-1 px-2.5 rounded hover-bg-light d-block text-start text-dark text-decoration-none"
            onClick={() => setShowMenu(false)}
          >
            🔍 Search Related Incidents
          </a>
          <a
            href={`/audit-logs?search=${encodeURIComponent(value)}`}
            className="dropdown-item py-1 px-2.5 rounded hover-bg-light d-block text-start text-dark text-decoration-none"
            onClick={() => setShowMenu(false)}
          >
            📋 Search Audit Logs
          </a>
          <button
            onClick={handleCopy}
            className="dropdown-item py-1 px-2.5 rounded hover-bg-light d-block text-start text-dark border-0 bg-transparent w-100"
          >
            📋 {copied ? "Copied!" : "Copy IOC"}
          </button>
          <hr className="my-1" />
          <button
            onClick={(e) => { e.stopPropagation(); setShowMenu(false); }}
            className="dropdown-item py-1 px-2.5 rounded hover-bg-light d-block text-start text-muted border-0 bg-transparent w-100"
          >
            ✕ Close
          </button>
        </div>
      )}
    </div>
  );
}

function IncidentDetails() {
  const { id } = useParams();
  
  const { refreshTrigger, triggerRefresh } = useContext(NotificationContext);
  
  const [incident, setIncident] = useState(null);
  const [loading, setLoading] = useState(true);
  const [attachments, setAttachments] = useState([]);
  const [escalations, setEscalations] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [reporterUser, setReporterUser] = useState(null);
  const [timelineEvents, setTimelineEvents] = useState([]);
  const [assignedUser, setAssignedUser] = useState(null);
  
  const [notes, setNotes] = useState("");
  const [resolution, setResolution] = useState("");
  const [adminRemarks, setAdminRemarks] = useState("");
  const [status, setStatus] = useState("");
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [generatingAi, setGeneratingAi] = useState(false);
  
  // Custom dialog visibility and inputs
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [closureValidation, setClosureValidation] = useState(null);
  const [loadingClosureValidation, setLoadingClosureValidation] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejectionError, setRejectionError] = useState("");
  const [allIncidents, setAllIncidents] = useState([]);
  const [checklist, setChecklist] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [aiRejectionReasonInput, setAiRejectionReasonInput] = useState("");
  const [aiError, setAiError] = useState("");
  const fileInputRef = useRef(null);

  // AI Assistant and SLA timer states
  const [initialDescription, setInitialDescription] = useState("");
  const [descriptionChanged, setDescriptionChanged] = useState(false);
  const [regenerationRequested, setRegenerationRequested] = useState(false);
  const [showModifyInput, setShowModifyInput] = useState(false);
  const [modifyPriorityInput, setModifyPriorityInput] = useState("");
  const [modifyCategoryInput, setModifyCategoryInput] = useState("");
  const [modifyReasonInput, setModifyReasonInput] = useState("");

  const [slaRemainingText, setSlaRemainingText] = useState("00:00:00");
  const [slaElapsedText, setSlaElapsedText] = useState("00:00:00");
  const [slaProgress, setSlaProgress] = useState(0);
  const [slaBreachTimeText, setSlaBreachTimeText] = useState("00:00:00");

  // SLA Timer State
  const [slaBreached, setSlaBreached] = useState(false);

  const currentUser = JSON.parse(localStorage.getItem("currentUser") || "{}");
  const role = currentUser?.role?.toUpperCase();
  const username = currentUser?.username;

  const fetchIncidentDetails = async () => {
    try {
      setLoading(true);
      const headers = { "Authorization": `Bearer ${localStorage.getItem("token")}` };
      
      let currentIncidentData = null;

      const res = await fetch(`${window.API_BASE_URL}/api/incidents/${id}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setIncident(data);
        currentIncidentData = data;
        setNotes(data.analystNotes || "");
        setResolution(data.resolutionSummary || "");
        setStatus(data.status || "");
        setAdminRemarks(data.adminRemarks || "");
        if (data && !initialDescription) {
          setInitialDescription(data.description || "");
        }
      } else {
        // Incident might have been resolved (and deleted from active). Check resolved table.
        const resRes = await fetch(window.API_BASE_URL + "/api/incidents/resolved", { headers });
        if (resRes.ok) {
          const resolvedList = await resRes.json();
          const found = resolvedList.find(r => String(r.incidentId) === String(id));
          if (found) {
            const data = {
              ...found,
              id: found.incidentId,
              title: found.title,
              category: found.category,
              priority: found.priority,
              status: "Closed",
              assignedTo: found.assignedAnalyst,
              assignedAnalystName: found.assignedAnalyst,
              reportedBy: found.reportedBy || "Archived System",
              timestamp: found.timestamp || found.resolvedTime,
              resolutionSummary: found.resolutionSummary,
              approvedBy: found.approvedBy,
              aiSummary: found.aiSummary,
              adminRemarks: found.adminRemarks,
              isResolvedArchived: true
            };
            setIncident(data);
            currentIncidentData = data;
            setNotes(data.analystNotes || "");
            setResolution(data.resolutionSummary || "");
            setStatus(data.status || "");
            setAdminRemarks(data.adminRemarks || "");
          }
        }
      }

      // Enforce Ownership check for Employees
      if (currentIncidentData && role === "EMPLOYEE") {
        if ((currentIncidentData.reportedBy || "").toLowerCase() !== username.toLowerCase()) {
          setErrorMsg("Access Denied. You are not authorized to view this incident.");
          setIncident(null);
          setLoading(false);
          return;
        }
      }

      // Parallelize secondary fetches
      if (currentIncidentData) {
        const fetchPromises = [
          // 0: Reporter Details
          currentIncidentData.reportedBy
            ? fetch(`${window.API_BASE_URL}/api/users/username/${currentIncidentData.reportedBy}`, { headers }).then(r => r.ok ? r.json() : null).catch(() => null)
            : Promise.resolve(null),
          // 1: Assigned Analyst Details
          currentIncidentData.assignedTo
            ? fetch(`${window.API_BASE_URL}/api/users/username/${currentIncidentData.assignedTo}`, { headers }).then(r => r.ok ? r.json() : null).catch(() => null)
            : Promise.resolve(null),
          // 2: Audit Logs
          fetch(`${window.API_BASE_URL}/api/audit/incident/${id}`, { headers }).then(r => r.ok ? r.json() : []).catch(() => []),
          // 3: Attachments
          fetch(`${window.API_BASE_URL}/api/incidents/${id}/attachments`, { headers }).then(r => r.ok ? r.json() : []).catch(() => []),
          // 4: Escalation History
          fetch(`${window.API_BASE_URL}/api/incidents/${id}/escalations`, { headers }).then(r => r.ok ? r.json() : []).catch(() => []),
          // 5: Assignment History
          fetch(`${window.API_BASE_URL}/api/incidents/${id}/assignments`, { headers }).then(r => r.ok ? r.json() : []).catch(() => []),
          // 6: Users list
          fetch(window.API_BASE_URL + "/api/users", { headers }).then(r => r.ok ? r.json() : []).catch(() => [])
        ];

        const [reporter, assignee, audits, atts, escs, assigns, usersData] = await Promise.all(fetchPromises);

        if (reporter) setReporterUser(reporter);
        if (assignee) setAssignedUser(assignee);
        setTimelineEvents(audits);
        setAttachments(atts);
        setEscalations(escs);
        setAssignments(assigns);
        setUsersList(usersData);
      }

    } catch (err) {
      console.error("Error loading incident details:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllIncidents = async () => {
    try {
      const headers = { "Authorization": `Bearer ${localStorage.getItem("token")}` };
      const [resActive, resResolved] = await Promise.all([
        fetch(window.API_BASE_URL + "/api/incidents", { headers }),
        fetch(window.API_BASE_URL + "/api/incidents/resolved", { headers })
      ]);
      let active = [];
      if (resActive.ok) active = await resActive.json();
      let resolved = [];
      if (resResolved.ok) resolved = await resResolved.json();
      const standardizedResolved = resolved.map(r => ({
        ...r,
        id: r.incidentId,
        status: "Closed"
      }));
      setAllIncidents([...active, ...standardizedResolved]);
    } catch (err) {
      console.error("Error fetching related incidents data:", err);
    }
  };

  useEffect(() => {
    if (incident) {
      if (incident.checklistState) {
        try {
          setChecklist(JSON.parse(incident.checklistState));
        } catch (e) {
          setChecklist(getDefaultChecklistForCategory(incident.category));
        }
      } else {
        setChecklist(getDefaultChecklistForCategory(incident.category));
      }
    }
  }, [incident]);

  useEffect(() => {
    if (incident && (incident.status?.toUpperCase() === "PENDING_APPROVAL" || incident.status?.toUpperCase() === "PENDING_ADMIN_APPROVAL")) {
      const fetchClosureValidation = async () => {
        try {
          setLoadingClosureValidation(true);
          const headers = { "Authorization": `Bearer ${localStorage.getItem("token")}` };
          const res = await fetch(`${window.API_BASE_URL}/api/incidents/${incident.id}/validate-closure`, { headers });
          if (res.ok) {
            const data = await res.json();
            setClosureValidation(data);
          }
        } catch (err) {
          console.error("Failed to fetch closure validation:", err);
        } finally {
          setLoadingClosureValidation(false);
        }
      };
      fetchClosureValidation();
    } else {
      setClosureValidation(null);
    }
  }, [incident]);

  useEffect(() => {
    if (incident && initialDescription && incident.description !== initialDescription) {
      setDescriptionChanged(true);
    }
  }, [incident, initialDescription]);

  const handleToggleChecklist = async (index) => {
    const updated = checklist.map((item, idx) => {
      if (idx === index) {
        const nextChecked = !item.checked;
        if (nextChecked) {
          const options = { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' };
          const timeStr = new Date().toLocaleDateString('en-GB', options).replace(/,/, '');
          return {
            ...item,
            checked: true,
            completedBy: username || "analyst",
            completedTime: timeStr
          };
        } else {
          return {
            ...item,
            checked: false,
            completedBy: null,
            completedTime: null
          };
        }
      }
      return item;
    });
    setChecklist(updated);

    try {
      const headers = {
        "Authorization": `Bearer ${localStorage.getItem("token")}`,
        "Content-Type": "application/json"
      };
      const res = await fetch(`${window.API_BASE_URL}/api/incidents/${id}/checklist`, {
        method: "PUT",
        headers,
        body: JSON.stringify({
          checklistState: JSON.stringify(updated)
        })
      });
      if (!res.ok) {
        console.error("Failed to save checklist state to backend.");
      }
    } catch (err) {
      console.error("Error saving checklist:", err);
    }
  };

  const handleAiRecommendation = async (status) => {
    try {
      const headers = {
        "Authorization": `Bearer ${localStorage.getItem("token")}`,
        "Content-Type": "application/json"
      };
      const res = await fetch(`${window.API_BASE_URL}/api/incidents/${id}/ai-recommendation`, {
        method: "PUT",
        headers,
        body: JSON.stringify({
          status,
          reason: status === "Rejected" ? aiRejectionReasonInput : ""
        })
      });
      if (res.ok) {
        setShowRejectInput(false);
        setAiRejectionReasonInput("");
        fetchIncidentDetails();
      } else {
        alert("Failed to update AI recommendation status.");
      }
    } catch (err) {
      console.error("Error updating AI recommendation:", err);
    }
  };

  const handleModifyRecommendation = async () => {
    if (!modifyReasonInput.trim()) {
      alert("Modification reason is required.");
      return;
    }
    try {
      const headers = {
        "Authorization": `Bearer ${localStorage.getItem("token")}`,
        "Content-Type": "application/json"
      };
      const res = await fetch(`${window.API_BASE_URL}/api/incidents/${id}/ai-recommendation`, {
        method: "PUT",
        headers,
        body: JSON.stringify({
          status: "Modified",
          reason: `Modified to Priority: ${modifyPriorityInput}, Category: ${modifyCategoryInput}. Reason: ${modifyReasonInput}`
        })
      });
      if (res.ok) {
        await fetch(`${window.API_BASE_URL}/api/incidents/${id}/status`, {
          method: "PUT",
          headers,
          body: JSON.stringify({
            status: incident.status,
            priority: modifyPriorityInput,
            category: modifyCategoryInput
          })
        });
        setShowModifyInput(false);
        setModifyReasonInput("");
        fetchIncidentDetails();
      } else {
        alert("Failed to modify recommendation.");
      }
    } catch (err) {
      console.error("Error modifying recommendation:", err);
    }
  };

  useEffect(() => {
    fetchIncidentDetails();
    fetchAllIncidents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, refreshTrigger]);

  // SLA Timer Countdown loop
  useEffect(() => {
    if (!incident || !incident.slaDeadline) {
      return;
    }

    const created = new Date(incident.createdTime || incident.timestamp);
    const deadline = new Date(incident.slaDeadline);

    const status = incident.status?.toUpperCase() || "";
    const isFinished = status === "CLOSED" || status === "RESOLVED" || status === "PENDING_APPROVAL" || incident.isResolvedArchived;

    // Formatter helper
    const formatDuration = (ms) => {
      if (ms < 0) return "00:00:00";
      const hrs = Math.floor(ms / (1000 * 60 * 60));
      const mins = Math.floor((ms / (1000 * 60)) % 60);
      const secs = Math.floor((ms / 1000) % 60);
      return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    };

    if (isFinished) {
      const endTimeStr = incident.resolvedTime || incident.closedTime || incident.approvedTime || incident.timestamp;
      const endTime = endTimeStr ? new Date(endTimeStr) : new Date();
      
      const totalMs = deadline - created;
      const elapsedMs = endTime - created;
      const remainingMs = deadline - endTime;

      setSlaElapsedText(formatDuration(elapsedMs));
      
      if (remainingMs <= 0) {
        setSlaRemainingText("00:00:00");
        setSlaProgress(100);
        setSlaBreached(true);
        setSlaBreachTimeText(formatDuration(endTime - deadline));
      } else {
        setSlaBreached(false);
        setSlaRemainingText(formatDuration(remainingMs));
        const pct = totalMs > 0 ? (elapsedMs / totalMs) * 100 : 0;
        setSlaProgress(Math.min(100, Math.max(0, pct)));
      }
      return;
    }

    const interval = setInterval(() => {
      const now = new Date();
      const totalMs = deadline - created;
      const elapsedMs = now - created;
      const remainingMs = deadline - now;

      setSlaElapsedText(formatDuration(elapsedMs));

      if (remainingMs <= 0) {
        setSlaRemainingText("00:00:00");
        setSlaProgress(100);
        setSlaBreached(true);
        const breachMs = now - deadline;
        setSlaBreachTimeText(formatDuration(breachMs));
      } else {
        setSlaBreached(false);
        
        const remText = formatDuration(remainingMs);
        setSlaRemainingText(remText);
        
        const pct = totalMs > 0 ? (elapsedMs / totalMs) * 100 : 0;
        setSlaProgress(Math.min(100, Math.max(0, pct)));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [incident]);

  const getCleanTimelineEvents = (events) => {
    if (!events) return [];
    const seen = new Set();
    const cleaned = [];
    events.forEach(evt => {
      let action = evt.action;
      let remarks = evt.remarks;

      if (action === "Management Review") {
        action = "Management Review Initiated";
        remarks = "Reason: No L2 specialist available.";
      }

      if (action && (action.toUpperCase() === "GENERATED AI INVESTIGATION COMPLIANCE" || action.toUpperCase() === "AI INVESTIGATION GENERATED" || action.toUpperCase() === "AI INVESTIGATION COMPLIANCE GENERATED")) {
        action = "AI Investigation Generated";
      }

      const key = `${action}_${remarks}`;
      if (seen.has(key)) {
        return;
      }
      seen.add(key);

      if (action === "Management Review Initiated" && cleaned.some(c => c.action === "Management Review Initiated")) {
        return;
      }

      cleaned.push({
        ...evt,
        action,
        remarks
      });
    });

    cleaned.sort((a, b) => {
      if (a.id && b.id) {
        return a.id - b.id;
      }
      return (a.timestamp || "").localeCompare(b.timestamp || "");
    });

    return cleaned;
  };



  const getActualAnalystForLevel = (levelKey, fallback) => {
    if (!assignments || assignments.length === 0) return fallback;
    const matched = assignments.find(a => {
      const lvl = getAnalystLevel(a.assignedTo, usersList);
      return lvl.includes(levelKey);
    });
    if (matched) {
      return matched.assignedTo;
    }
    return fallback;
  };

  // Programmatic download & preview handlers with Authorization Bearer header
  const handleDownloadAttachment = async (attId, filename) => {
    try {
      const headers = { "Authorization": `Bearer ${localStorage.getItem("token")}` };
      const res = await fetch(`${window.API_BASE_URL}/api/incidents/attachments/${attId}`, { headers });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else if (res.status === 404) {
        alert("The requested file was not found on the server (404).");
      } else if (res.status === 403) {
        alert("Access Denied (403). You do not have permission to download this attachment.");
      } else {
        alert("Failed to download attachment.");
      }
    } catch (err) {
      console.error(err);
      alert("Error downloading file.");
    }
  };

  const handlePreviewAttachment = async (attId) => {
    try {
      const headers = { "Authorization": `Bearer ${localStorage.getItem("token")}` };
      const res = await fetch(`${window.API_BASE_URL}/api/incidents/attachments/${attId}`, { headers });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        window.open(url, "_blank");
      } else if (res.status === 404) {
        alert("The requested file was not found on the server (404).");
      } else if (res.status === 403) {
        alert("Access Denied (403). You do not have permission to preview this attachment.");
      } else {
        alert("Failed to open preview.");
      }
    } catch (err) {
      console.error(err);
      alert("Error opening preview.");
    }
  };

  // Save notes handler
  const handleSaveNotes = async () => {
    try {
      const res = await fetch(`${window.API_BASE_URL}/api/incidents/${id}/notes`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({ analystNotes: notes })
      });
      if (res.ok) {
        alert("Analyst notes saved");
        fetchIncidentDetails();
      }
    } catch (err) {
      alert("Error saving notes");
    }
  };

  // Save administrative remarks handler
  const handleSaveRemarks = async () => {
    try {
      const res = await fetch(`${window.API_BASE_URL}/api/incidents/${id}/remarks`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({ adminRemarks })
      });
      if (res.ok) {
        alert("Administrative Remarks saved");
        fetchIncidentDetails();
      } else {
        alert("Error saving remarks");
      }
    } catch (err) {
      console.error(err);
      alert("Error saving remarks");
    }
  };

  // Update Status handler
  const handleUpdateStatus = async (newStatus) => {
    try {
      const res = await fetch(`${window.API_BASE_URL}/api/incidents/${id}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        setStatus(newStatus);
        alert("Status updated successfully to " + newStatus);
        fetchIncidentDetails();
      }
    } catch (err) {
      alert("Error updating status");
    }
  };

  // Submit Resolution for Approval
  const handleSubmitResolution = async () => {
    if (!resolution) {
      alert("Please specify the resolution details first.");
      return;
    }
    try {
      // 1. Save resolution summary
      await fetch(`${window.API_BASE_URL}/api/incidents/${id}/resolution`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({ resolutionSummary: resolution })
      });

      // 2. Submit for approval
      const res = await fetch(`${window.API_BASE_URL}/api/incidents/${id}/submit-for-approval`, {
        method: "PUT",
        headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
      });

      if (res.ok) {
        alert("Incident submitted for approval");
        fetchIncidentDetails();
      }
    } catch (err) {
      alert("Error submitting resolution");
    }
  };

  // Manual Escalate L2
  const handleManualEscalate = async () => {
    try {
      const res = await fetch(`${window.API_BASE_URL}/api/incidents/${id}/escalate`, {
        method: "PUT",
        headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
      });
      if (res.ok) {
        alert("Incident manual escalation triggered!");
        fetchIncidentDetails();
      } else {
        alert("Escalation failed. Verify analyst workloads or roles.");
      }
    } catch (err) {
      alert("Error triggering escalation");
    }
  };

  // Approve Resolution (Admin Submit)
  const submitApprove = async () => {
    try {
      const res = await fetch(`${window.API_BASE_URL}/api/incidents/${id}/approve`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({ approvedBy: username, adminRemarks: adminRemarks })
      });
      if (res.ok) {
        setShowApproveModal(false);
        alert("Incident closed and archived successfully.");
        fetchIncidentDetails();
        triggerRefresh();
      }
    } catch (err) {
      alert("Error approving resolution");
    }
  };

  // Reject Resolution (Admin Submit)
  const submitReject = async () => {
    if (!rejectionReason.trim()) {
      setRejectionError("Rejection reason is required.");
      return;
    }
    try {
      const res = await fetch(`${window.API_BASE_URL}/api/incidents/${id}/reject`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({ rejectedBy: username, rejectionReason: rejectionReason })
      });
      if (res.ok) {
        setShowRejectModal(false);
        setRejectionReason("");
        alert("Resolution rejected. Returned to analyst workflow.");
        fetchIncidentDetails();
        triggerRefresh();
      }
    } catch (err) {
      alert("Error rejecting resolution");
    }
  };

  // Generate AI Analysis (Analyst / Admin)
  const handleGenerateAiAnalysis = async () => {
    const hasAi = incident?.aiAssistantSummary || incident?.aiAssistantRootCause;
    if (hasAi && !descriptionChanged && !regenerationRequested) {
      alert("AI analysis already generated and up to date.");
      return;
    }
    try {
      setGeneratingAi(true);
      setAiError("");
      const headers = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${localStorage.getItem("token")}`
      };
      const url = `${window.API_BASE_URL}/api/incidents/${id}/ai-analysis${hasAi ? "?regenerate=true" : ""}`;
      const res = await fetch(url, {
        method: "POST",
        headers
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success === false) {
          setAiError(data.error || "AI Investigation service is temporarily unavailable. Manual investigation can continue normally.");
        } else {
          setIncident(data);
          setRegenerationRequested(false);
          setDescriptionChanged(false);
          alert("AI Investigation generated successfully.");
          triggerRefresh();
        }
      } else {
        const errData = await res.json();
        setAiError(errData.message || "AI Investigation service is temporarily unavailable. Manual investigation can continue normally.");
      }
    } catch (err) {
      setAiError("Network error: Failed to reach the AI assistant service.");
    } finally {
      setGeneratingAi(false);
    }
  };

  // File Attachment Upload
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("username", username);

    setUploading(true);
    try {
      const res = await fetch(`${window.API_BASE_URL}/api/incidents/${id}/attachments`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` },
        body: formData
      });
      if (res.ok) {
        alert("File attached successfully!");
        fetchIncidentDetails();
      } else {
        alert("Failed to upload attachment");
      }
    } catch (err) {
      alert("Upload connection error");
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="app-wrapper">
        <Navbar />
        <div className="page-container">
          <Sidebar />
          <div className="main-content py-5 text-center">
            <div className="spinner-border text-primary" role="status"></div>
            <p className="mt-2 text-muted">Retrieving incident telemetry details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="app-wrapper">
        <Navbar />
        <div className="page-container">
          <Sidebar />
          <div className="main-content">
            <BackButton />
            <div className="alert alert-danger mt-3">{errorMsg}</div>
          </div>
        </div>
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="app-wrapper">
        <Navbar />
        <div className="page-container">
          <Sidebar />
          <div className="main-content">
            <BackButton />
            <div className="alert alert-warning mt-3">Incident telemetry could not be found.</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-wrapper">
      <Navbar />
      <div className="page-container">
        <Sidebar />
        <div className="main-content">
          <div className="soc-breadcrumb">
            <Link to="/dashboard">Home</Link>
            <span>/</span>
            <Link to="/incidents">Incidents</Link>
            <span>/</span>
            <span>{formatIncidentId(incident.id)} Details</span>
          </div>

          <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
            <div>
              <h2 className="m-0 fw-bold">Incident {formatIncidentId(incident.id)} Telemetry</h2>
              <p className="text-muted m-0">{incident.title}</p>
            </div>
            {!incident.isResolvedArchived && (
              <div className="d-flex gap-2">
                {role === "ANALYST" && incident.assignedTo === username && incident.status?.toUpperCase() !== "ESCALATED" && (
                  <button onClick={handleManualEscalate} className="btn btn-soc btn-outline-warning">
                    <FaArrowUp /> Manual Escalate L2
                  </button>
                )}
                {role === "ADMIN" && (
                  incident.status?.toUpperCase() === "PENDING_APPROVAL" ||
                  incident.status?.toUpperCase() === "PENDING_ADMIN_APPROVAL" ||
                  incident.status === "Pending Approval"
                ) && (
                  <>
                    <button onClick={() => setShowApproveModal(true)} className="btn btn-success d-flex align-items-center gap-1.5 fw-semibold">
                      <FaCheck /> Approve Resolution
                    </button>
                    <button onClick={() => setShowRejectModal(true)} className="btn btn-danger d-flex align-items-center gap-1.5 fw-semibold">
                      <FaTimes /> Reject Resolution
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {incident.status?.toUpperCase() === "PENDING_ASSIGNMENT" && (
            <div className="alert alert-info border border-info shadow-sm py-3 px-4 mb-4 animate-fade-in text-start" role="alert">
              <h5 className="alert-heading fw-bold d-flex align-items-center gap-2 m-0">
                <FaClock /> Pending Assignment
              </h5>
              <p className="mb-0 mt-2" style={{ fontSize: "14.5px", color: "#1e293b" }}>
                Your incident has been successfully submitted and is currently waiting for analyst assignment.
              </p>
            </div>
          )}

          {(incident.status?.toUpperCase() === "PENDING_APPROVAL" || incident.status?.toUpperCase() === "PENDING_ADMIN_APPROVAL" || incident.status === "Pending Approval") && (
            <div className="card border-info shadow-sm p-4 mb-4 text-start animate-fade-in" style={{ backgroundColor: "#fafbfc" }}>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="fw-bold text-dark m-0 d-flex align-items-center gap-2">
                  🛡️ AI Incident Closure Validation
                </h5>
                <span className={`badge bg-${
                  closureValidation && closureValidation.score >= 70 ? 'success' : 'danger'
                }`} style={{ fontSize: "14px" }}>
                  Validation Score: {closureValidation ? closureValidation.score : 0}%
                </span>
              </div>
              
              {loadingClosureValidation ? (
                <div className="text-center py-3">
                  <div className="spinner-border spinner-border-sm text-info" role="status"></div>
                  <span className="ms-2 text-muted" style={{ fontSize: "13.5px" }}>Performing AI closure validation...</span>
                </div>
              ) : closureValidation ? (
                <>
                  <div className="mb-3">
                    <div className="text-secondary fw-semibold mb-2" style={{ fontSize: "12.5px" }}>Analysis Checkpoints:</div>
                    <div className="d-flex flex-column gap-1.5">
                      {(closureValidation.checkpoints || []).map((checkpoint, idx) => (
                        <div key={idx} className="d-flex align-items-center gap-2" style={{ fontSize: "13.5px" }}>
                          <span className={checkpoint.startsWith("✓") ? "text-success fw-bold" : "text-danger fw-bold"}>
                            {checkpoint.startsWith("✓") ? "✓" : "✗"}
                          </span>
                          <span>{checkpoint.substring(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="p-3 rounded border bg-white">
                    <strong className="text-dark d-block mb-1" style={{ fontSize: "13px" }}>AI Recommendation & Status:</strong>
                    <span className={`fw-bold d-block ${
                      closureValidation.score >= 70 ? 'text-success' : 'text-danger'
                    }`} style={{ fontSize: "14px" }}>
                      {closureValidation.recommendation}
                    </span>
                  </div>
                </>
              ) : (
                <p className="text-muted m-0">No validation results available.</p>
              )}
            </div>
          )}

          <div className="row g-4">
            {/* Left side details */}
            <div className="col-lg-8">
              {/* Telemetry card */}
              <div className="soc-card mb-4 shadow-sm">
                <div className="soc-card-title fw-bold mb-3">Incident Information</div>
                <div className="row mb-3">
                  <div className="col-md-6">
                    <small className="text-muted d-block text-uppercase" style={{ fontSize: "11px", fontWeight: "600" }}>Category</small>
                    <span className="badge bg-light text-dark border fs-6 mt-1">{formatSpecialization(incident.category)}</span>
                  </div>
                  <div className="col-md-6">
                    <small className="text-muted d-block text-uppercase" style={{ fontSize: "11px", fontWeight: "600" }}>Source</small>
                    <span className="fw-semibold text-dark mt-1 d-block">{incident.source || "System"}</span>
                  </div>
                </div>

                <div className="mb-4">
                  <small className="text-muted d-block mb-1 text-uppercase" style={{ fontSize: "11px", fontWeight: "600" }}>Description</small>
                  <div className="bg-light p-3 rounded border text-secondary" style={{ fontSize: "14px", lineHeight: "1.6" }}>
                    {incident.description || "No description provided."}
                  </div>
                </div>

                <div className="row">
                  <div className="col-6">
                    <small className="text-muted text-uppercase" style={{ fontSize: "11px", fontWeight: "600" }}>Reporter</small>
                    <p className="fw-bold m-0 text-dark">{incident.reportedBy}</p>
                  </div>
                  <div className="col-6">
                    <small className="text-muted text-uppercase" style={{ fontSize: "11px", fontWeight: "600" }}>Reported Time</small>
                    <p className="fw-bold m-0 text-dark">{formatTimestamp(incident.timestamp)}</p>
                  </div>
                </div>
              </div>

              {/* Indicators of Compromise (IoCs) Card */}
              {(() => {
                const iocs = extractIoCs(incident.description, incident.aiAssistantKeyIndicators);
                const rawItems = [
                  { label: "External IP", value: iocs.externalIp, icon: <FaGlobe className="text-danger" /> },
                  { label: "Internal IP", value: iocs.internalIp, icon: <FaGlobe className="text-info" /> },
                  { label: "Domain Name", value: iocs.domain, icon: <FaGlobe className="text-primary" /> },
                  { label: "URL", value: iocs.url, icon: <FaLink className="text-secondary" /> },
                  { label: "Email Address", value: iocs.email, icon: <FaEnvelope className="text-warning" /> },
                  { label: "Username", value: (incident.description && incident.description.toLowerCase().includes("jeeva") ? "jeeva" : incident.reportedBy), icon: <FaUser className="text-success" /> },
                  { label: "File Hash (MD5/SHA)", value: iocs.hash, icon: <FaHashtag className="text-dark" /> },
                  { label: "Registry Key", value: iocs.registry, icon: <FaKey className="text-danger" /> },
                  { label: "PowerShell Command", value: iocs.powershell, icon: <FaTerminal className="text-warning" /> },
                  { label: "File Name", value: iocs.file, icon: <FaFileCode className="text-primary" /> },
                  { label: "Device Name", value: iocs.device, icon: <FaDesktop className="text-info" /> },
                ];

                const isIdentified = (val) => {
                  if (!val) return false;
                  const str = String(val).trim().toLowerCase();
                  if (str === "" || 
                      str === "not identified" || 
                      str === "n/a" || 
                      str === "-" || 
                      str.includes("no specific indicators identified")) {
                    return false;
                  }
                  return true;
                };

                const items = rawItems.filter(item => isIdentified(item.value));

                return (
                  <div className="soc-card mb-4 shadow-sm border border-danger-subtle">
                    <div className="soc-card-title fw-bold mb-3 d-flex align-items-center gap-2 text-start">
                      <FaShieldAlt className="text-danger" />
                      <span>Indicators of Compromise (IoCs)</span>
                    </div>
                    {items.length === 0 ? (
                      <div className="text-muted text-center py-3" style={{ fontSize: "13px" }}>
                        — No Indicator Found
                      </div>
                    ) : (
                      <div className="row g-3">
                        {items.map((item, idx) => (
                          <div className="col-md-6 col-lg-4" key={idx}>
                            <div className="p-3 rounded border bg-light h-100 text-start">
                              <small className="text-muted d-flex align-items-center gap-1.5 fw-semibold mb-1" style={{ fontSize: "11px" }}>
                                {item.icon}
                                {item.label}
                              </small>
                              <div className="text-dark fw-bold text-truncate" style={{ fontSize: "12.5px" }} title={item.value}>
                                <ClickableIoc value={item.value} />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* AI Summary Block */}
              {incident.aiSummary && (
                <div className="soc-card mb-4 shadow-sm border border-primary-subtle" style={{ backgroundColor: "#f0f7ff" }}>
                  <div className="soc-card-title fw-bold mb-2 text-primary d-flex align-items-center gap-2 border-0 pb-0">
                    <span className="badge bg-primary text-white" style={{ fontSize: "9px" }}>AI COGNITIVE ANALYSIS</span>
                    <span style={{ fontSize: "14px" }}>AI Incident Summary</span>
                  </div>
                  <div className="p-3 bg-white rounded border text-secondary" style={{ fontSize: "13.5px", lineHeight: "1.6", whiteSpace: "pre-line" }}>
                    {incident.aiSummary}
                  </div>
                </div>
              )}

              {/* AI Recommended Actions */}
              {(() => {
                const getAiRecommendations = (cat) => {
                  if (!cat) return [];
                  const catLower = cat.toLowerCase();

                  if (catLower.includes("malware") || catLower.includes("virus") || catLower.includes("endpoint")) {
                    return [
                      { action: "Isolate Device", description: "Disconnect the affected device from the local network immediately to prevent lateral spread." },
                      { action: "Run Full Scan", description: "Trigger an updated host-based EDR/antivirus full system scan." },
                      { action: "Collect Logs", description: "Collect Windows Event Logs, Sysmon telemetry, and volatile memory dumps for forensics." }
                    ];
                  } else if (catLower.includes("phish") || catLower.includes("social")) {
                    return [
                      { action: "Reset Password", description: "Enforce an immediate password change for the target employee account." },
                      { action: "Block Sender", description: "Add the malicious sender's domain/IP address to the email gateway blocklist." },
                      { action: "Enable MFA", description: "Ensure Multi-Factor Authentication is fully enforced and review active session grants." }
                    ];
                  } else if (catLower.includes("unauthorized") || catLower.includes("access") || catLower.includes("brute") || catLower.includes("hack")) {
                    return [
                      { action: "Lock Account", description: "Lock suspicious accounts originating traffic if credentials are suspected." },
                      { action: "Reset Credentials", description: "Rotate access keys or API credentials for resources under attack." },
                      { action: "Review Logs", description: "Examine firewall logs, netflow telemetry, and load balancer rules to block attack vectors." }
                    ];
                  } else if (catLower.includes("ransomware") || catLower.includes("encrypt")) {
                    return [
                      { action: "Disconnect Device", description: "Physically pull the network cable or disable Wi-Fi on the host immediately." },
                      { action: "Restore Backup", description: "Identify the last clean backup archive before the encryption timeline." },
                      { action: "Preserve Evidence", description: "Do not restart or power down the device to preserve volatile memory encryption keys." }
                    ];
                  } else if (catLower.includes("leak") || catLower.includes("breach") || catLower.includes("data")) {
                    return [
                      { action: "Notify Security Team", description: "Escalate telemetry and details to the Data Security Response Unit." },
                      { action: "Preserve Logs", description: "Lock database transaction logs, cloud trail logs, and audit tables." },
                      { action: "Start Investigation", description: "Determine scope, volume, and severity of data exfiltrated." }
                    ];
                  }

                  return [
                    { action: "Isolate System", description: "Isolate the virtual network interface or isolate the host device if compromised." },
                    { action: "Verify Log History", description: "Analyze audit trials, authentication logs, and change logs for the incident timeline." },
                    { action: "Review User Privileges", description: "Audit access controls, role assignments, and token scopes." }
                  ];
                };

                const recommendations = getAiRecommendations(incident.category);
                if (recommendations.length === 0) return null;

                return (
                  <div className="soc-card mb-4 shadow-sm border border-warning-subtle" style={{ backgroundColor: "#fffbf2" }}>
                    <div className="soc-card-title fw-bold mb-3 text-warning-emphasis d-flex align-items-center gap-2 border-0 pb-0">
                      <span className="badge bg-warning text-dark" style={{ fontSize: "9px" }}>RECOMMENDED RESPONSE</span>
                      <span style={{ fontSize: "14px" }}>AI Recommended Actions</span>
                    </div>
                    <div className="row g-3 p-3">
                      {recommendations.map((rec, i) => (
                        <div key={i} className="col-md-4">
                          <div className="bg-white p-3 rounded border h-100 shadow-sm text-start">
                            <h6 className="fw-bold text-dark mb-1" style={{ fontSize: "13px" }}>{rec.action}</h6>
                            <p className="text-muted m-0" style={{ fontSize: "11px", lineHeight: "1.4" }}>
                              {rec.description}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* AI Investigation Assistant Section */}
              {(role === "ANALYST" || role === "ADMIN") && (
                <div className="soc-card mb-4 shadow-sm border border-info-subtle">
                  <div className="soc-card-title fw-bold mb-3 d-flex align-items-center justify-content-between">
                    <div className="d-flex align-items-center gap-2">
                      <span className="badge bg-info text-dark" style={{ fontSize: "9px" }}>DECISION SUPPORT</span>
                      <span>AI Investigation Assistant</span>
                    </div>
                    {!incident?.isResolvedArchived && (
                      <div className="d-flex align-items-center gap-2">
                        <button
                          onClick={handleGenerateAiAnalysis}
                          disabled={generatingAi || (!!(incident?.aiAssistantSummary || incident?.aiAssistantRootCause) && !descriptionChanged && !regenerationRequested)}
                          className="btn btn-soc btn-sm btn-outline-info"
                        >
                          {generatingAi ? (
                            <>
                              <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                              Generating...
                            </>
                          ) : (
                            "Analyze Incident"
                          )}
                        </button>
                        {!!(incident?.aiAssistantSummary || incident?.aiAssistantRootCause) && !descriptionChanged && !regenerationRequested && (
                          <button
                            onClick={() => setRegenerationRequested(true)}
                            className="btn btn-sm btn-outline-secondary"
                            style={{ fontSize: "11px" }}
                          >
                            Request AI Regeneration
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {aiError && (
                    <div className="alert alert-danger mx-3 my-2" role="alert">
                      {aiError}
                    </div>
                  )}

                  {generatingAi && (
                    <div className="text-center py-4">
                      <div className="spinner-border text-info" role="status">
                        <span className="visually-hidden">Loading...</span>
                      </div>
                      <p className="text-muted mt-2 mb-0" style={{ fontSize: "13px" }}>Analyzing incident details and logs...</p>
                    </div>
                  )}

                  {!generatingAi && (
                    <div className="p-3">
                      {incident?.aiAssistantSummary || incident?.aiAssistantRootCause || incident?.aiAssistantInvestigationSteps || incident?.aiAssistantContainmentActions || incident?.aiAssistantKeyIndicators || incident?.aiAssistantRecommendedResolution || incident?.aiAssistantRiskLevel || incident?.aiAssistantConfidenceScore ? (
                        <>
                          <div className="card mb-4 bg-light border border-info-subtle shadow-none text-start">
                            <div className="card-header bg-info-subtle border-info-subtle py-2">
                              <h6 className="m-0 fw-bold text-info-emphasis" style={{ fontSize: "13px" }}>
                                AI Investigation Report
                              </h6>
                            </div>
                            <div className="card-body p-3">
                              <div className="row g-2" style={{ fontSize: "12.5px" }}>
                                <div className="col-12 border-bottom pb-1.5 mb-1.5 text-start">
                                  <div className="row">
                                    <div className="col-4 text-muted fw-semibold" style={{ fontSize: "12px" }}>Engine</div>
                                    <div className="col-8 text-dark fw-bold" style={{ fontSize: "12.5px" }}>Local AI</div>
                                  </div>
                                </div>
                                <div className="col-12 border-bottom pb-1.5 mb-1.5 text-start">
                                  <div className="row">
                                    <div className="col-4 text-muted fw-semibold" style={{ fontSize: "12px" }}>Version</div>
                                    <div className="col-8 text-dark fw-bold" style={{ fontSize: "12.5px" }}>v2.0.0-offline</div>
                                  </div>
                                </div>
                                <div className="col-12 border-bottom pb-1.5 mb-1.5 text-start">
                                  <div className="row">
                                    <div className="col-4 text-muted fw-semibold" style={{ fontSize: "12px" }}>Generated Time</div>
                                    <div className="col-8 text-dark fw-bold" style={{ fontSize: "12.5px" }}>{formatTimestamp(incident.generatedTime || incident.updatedTime)}</div>
                                  </div>
                                </div>
                                <div className="col-12 border-bottom pb-1.5 mb-1.5 text-start">
                                  <div className="row">
                                    <div className="col-4 text-muted fw-semibold" style={{ fontSize: "12px" }}>Incident Category</div>
                                    <div className="col-8 text-dark fw-bold" style={{ fontSize: "12.5px" }}>{incident.category || "N/A"}</div>
                                  </div>
                                </div>
                                <div className="col-12 border-bottom pb-1.5 mb-1.5 text-start">
                                  <div className="row">
                                    <div className="col-4 text-muted fw-semibold" style={{ fontSize: "12px" }}>Assigned Analyst</div>
                                    <div className="col-8 text-dark fw-bold" style={{ fontSize: "12.5px" }}>{assignedUser?.fullName || incident.assignedAnalystName || "Unassigned"}</div>
                                  </div>
                                </div>
                                <div className="col-12 border-bottom pb-1.5 mb-1.5 text-start">
                                  <div className="row">
                                    <div className="col-4 text-muted fw-semibold" style={{ fontSize: "12px" }}>Incident Status</div>
                                    <div className="col-8 text-dark fw-bold" style={{ fontSize: "12.5px" }}>{incident.status || "N/A"}</div>
                                  </div>
                                </div>
                                <div className="col-12 border-bottom pb-1.5 mb-1.5 text-start">
                                  <div className="row">
                                    <div className="col-4 text-muted fw-semibold" style={{ fontSize: "12px" }}>Priority</div>
                                    <div className="col-8 text-dark fw-bold" style={{ fontSize: "12.5px" }}>{incident.priority || "N/A"}</div>
                                  </div>
                                </div>
                                <div className="col-12 border-bottom pb-1.5 mb-1.5 text-start">
                                  <div className="row">
                                    <div className="col-4 text-muted fw-semibold" style={{ fontSize: "12px" }}>Routing Confidence</div>
                                    <div className="col-8 text-dark fw-bold" style={{ fontSize: "12.5px" }}>{incident.routingConfidence || 0}%</div>
                                  </div>
                                </div>
                                <div className="col-12 border-bottom pb-1.5 mb-1.5 text-start">
                                  <div className="row">
                                    <div className="col-4 text-muted fw-semibold" style={{ fontSize: "12px" }}>Validation Status</div>
                                    <div className="col-8 text-dark fw-bold" style={{ fontSize: "12.5px" }}>{closureValidation ? `${closureValidation.score}% (${closureValidation.score >= 70 ? 'Approved for Closure' : 'Needs Review'})` : "Pending"}</div>
                                  </div>
                                </div>
                                <div className="col-12 text-start">
                                  <div className="row">
                                    <div className="col-4 text-muted fw-semibold" style={{ fontSize: "12px" }}>Checklist Progress</div>
                                    <div className="col-8 text-dark fw-bold" style={{ fontSize: "12.5px" }}>
                                      {(() => {
                                        const items = checklist || [];
                                        const total = items.length;
                                        const completed = items.filter(i => i.checked).length;
                                        return total > 0 ? `${completed}/${total} (${Math.round((completed / total) * 100)}%)` : "0/0 (0%)";
                                      })()}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="row g-3">
                            <div className="col-12 text-start">
                              <div className="p-4 bg-light rounded border border-info-subtle" style={{ backgroundColor: "#fafbfc" }}>
                                <div className="text-secondary mb-3 pb-3 border-bottom" style={{ fontSize: "13.5px", lineHeight: "1.7", whiteSpace: "pre-line" }}>
                                  {[
                                    incident.aiAssistantSummary,
                                    incident.aiAssistantKeyIndicators,
                                    incident.aiAssistantRootCause,
                                    incident.aiAssistantInvestigationSteps,
                                    incident.aiAssistantContainmentActions,
                                    incident.aiAssistantRecommendedResolution
                                  ].filter(Boolean).join("\n\n")}
                                </div>

                                {!incident?.isResolvedArchived && (
                                  <div className="mt-3 d-flex align-items-center justify-content-between flex-wrap gap-2">
                                    <div className="d-flex align-items-center gap-2">
                                      <span className="text-muted fw-bold text-uppercase" style={{ fontSize: "10px" }}>AI Action Decision:</span>
                                      {(() => {
                                        const status = incident.aiRecommendationStatus || "Pending";
                                        let badgeClass = "bg-warning text-dark";
                                        let text = "Pending Review";
                                        if (status === "Approved") {
                                          badgeClass = "bg-success text-white";
                                          text = "Approved";
                                        } else if (status === "Rejected") {
                                          badgeClass = "bg-danger text-white";
                                          text = "Rejected";
                                        } else if (status === "Modified") {
                                          badgeClass = "bg-info text-dark";
                                          text = "Modified";
                                        }
                                        return <span className={`badge ${badgeClass}`} style={{ fontSize: "11px" }}>{text}</span>;
                                      })()}
                                    </div>

                                    {!incident.aiRecommendationStatus || incident.aiRecommendationStatus === "Pending" ? (
                                      <div className="d-flex gap-2">
                                        <button
                                          onClick={() => handleAiRecommendation("Approved")}
                                          className="btn btn-sm btn-success d-flex align-items-center gap-1.5"
                                          style={{ fontSize: "12px" }}
                                        >
                                          <FaCheckCircle /> Approve
                                        </button>
                                        <button
                                          onClick={() => { setShowRejectInput(true); setShowModifyInput(false); }}
                                          className="btn btn-sm btn-danger d-flex align-items-center gap-1.5"
                                          style={{ fontSize: "12px" }}
                                        >
                                          <FaExclamationTriangle /> Reject
                                        </button>
                                        <button
                                          onClick={() => {
                                            setShowModifyInput(true);
                                            setShowRejectInput(false);
                                            setModifyPriorityInput(incident.priority || "Medium");
                                            setModifyCategoryInput(incident.category || "IDENTITY_ACCESS");
                                          }}
                                          className="btn btn-sm btn-info text-dark d-flex align-items-center gap-1.5"
                                          style={{ fontSize: "12px" }}
                                        >
                                          <FaHistory /> Modify
                                        </button>
                                      </div>
                                    ) : (
                                      incident.aiRejectionReason && (
                                        <div className="w-100 mt-2 p-2 bg-white rounded border border-light text-secondary italic" style={{ fontSize: "12px" }}>
                                          Override Reason: {incident.aiRejectionReason}
                                        </div>
                                      )
                                    )}
                                  </div>
                                )}

                                {showRejectInput && (
                                  <div className="mt-3 p-3 bg-light rounded border border-danger-subtle text-start">
                                    <label className="form-label fw-semibold text-dark mb-1.5" style={{ fontSize: "12px" }}>
                                      Reason for Override / Rejection (Mandatory)
                                    </label>
                                    <textarea
                                      className="form-control mb-2"
                                      rows="2"
                                      placeholder="Provide a detailed explanation for overriding the AI triage recommendation..."
                                      value={aiRejectionReasonInput}
                                      onChange={(e) => setAiRejectionReasonInput(e.target.value)}
                                      style={{ fontSize: "13px" }}
                                    />
                                    <div className="d-flex gap-2">
                                      <button
                                        onClick={() => handleAiRecommendation("Rejected")}
                                        className="btn btn-sm btn-danger"
                                        style={{ fontSize: "12px" }}
                                        disabled={!aiRejectionReasonInput.trim()}
                                      >
                                        Submit Rejection
                                      </button>
                                      <button
                                        onClick={() => {
                                          setShowRejectInput(false);
                                          setAiRejectionReasonInput("");
                                        }}
                                        className="btn btn-sm btn-secondary"
                                        style={{ fontSize: "12px" }}
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                )}

                                {showModifyInput && (
                                  <div className="mt-3 p-3 bg-light rounded border border-info-subtle text-start">
                                    <div className="row g-2 mb-2">
                                      <div className="col-md-6">
                                        <label className="form-label fw-semibold mb-1" style={{ fontSize: "12px" }}>New Priority</label>
                                        <select
                                          className="form-select form-select-sm"
                                          value={modifyPriorityInput}
                                          onChange={(e) => setModifyPriorityInput(e.target.value)}
                                          style={{ fontSize: "12px" }}
                                        >
                                          <option value="Low">Low</option>
                                          <option value="Medium">Medium</option>
                                          <option value="High">High</option>
                                          <option value="Critical">Critical</option>
                                        </select>
                                      </div>
                                      <div className="col-md-6">
                                        <label className="form-label fw-semibold mb-1" style={{ fontSize: "12px" }}>New Category</label>
                                        <select
                                          className="form-select form-select-sm"
                                          value={modifyCategoryInput}
                                          onChange={(e) => setModifyCategoryInput(e.target.value)}
                                          style={{ fontSize: "12px" }}
                                        >
                                          <option value="IDENTITY_ACCESS">Identity & Access Management</option>
                                          <option value="NETWORK_SECURITY">Network Security</option>
                                          <option value="ENDPOINT_SECURITY">Endpoint Security</option>
                                          <option value="CLOUD_SECURITY">Cloud Security</option>
                                          <option value="DATA_SECURITY">Data Security</option>
                                          <option value="EMAIL_SECURITY">Email Security</option>
                                          <option value="APPLICATION_SECURITY">Application Security</option>
                                          <option value="VULNERABILITY">Vulnerability Management</option>
                                          <option value="THREAT_INTEL">Threat Intelligence</option>
                                          <option value="COMPLIANCE">Compliance & Auditing</option>
                                          <option value="INCIDENT_RESPONSE">Incident Response</option>
                                          <option value="BEHAVIORAL_ANOMALY">Behavioral Anomaly</option>
                                          <option value="OTHERS">Others</option>
                                        </select>
                                      </div>
                                    </div>
                                    <div className="mb-2">
                                      <label className="form-label fw-semibold mb-1" style={{ fontSize: "12px" }}>Reason for Modification (Mandatory)</label>
                                      <textarea
                                        className="form-control"
                                        rows="2"
                                        placeholder="Provide reasoning for changing category/priority..."
                                        value={modifyReasonInput}
                                        onChange={(e) => setModifyReasonInput(e.target.value)}
                                        style={{ fontSize: "12px" }}
                                      />
                                    </div>
                                    <div className="d-flex gap-2">
                                      <button
                                        onClick={handleModifyRecommendation}
                                        className="btn btn-sm btn-info text-dark"
                                        style={{ fontSize: "12px" }}
                                        disabled={!modifyReasonInput.trim()}
                                      >
                                        Submit Modification
                                      </button>
                                      <button
                                        onClick={() => {
                                          setShowModifyInput(false);
                                          setModifyReasonInput("");
                                        }}
                                        className="btn btn-sm btn-secondary"
                                        style={{ fontSize: "12px" }}
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                )}

                              </div>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="text-center py-3 text-muted" style={{ fontSize: "13px" }}>
                          No AI analysis generated yet. Click the button to analyze this incident.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* MITRE ATT&CK Mapping Card */}
              {!incident.aiAssistantSummary && (() => {
                const mapping = getMitreMapping(incident.category, incident.title, incident.description);
                return (
                  <div className="soc-card mb-4 shadow-sm border border-warning-subtle text-start">
                    <div className="soc-card-title fw-bold mb-3 d-flex align-items-center gap-2">
                      <FaShieldAlt className="text-warning-emphasis" />
                      <span>MITRE ATT&CK Mapping</span>
                    </div>
                    {!mapping ? (
                      <div className="text-muted text-center py-3" style={{ fontSize: "13px" }}>No ATT&CK mapping available.</div>
                    ) : (
                      <div className="table-responsive">
                        <table className="table table-sm table-bordered table-striped m-0" style={{ fontSize: "12.5px" }}>
                          <thead className="table-light">
                            <tr>
                              <th>Tactic</th>
                              <th>Technique</th>
                              <th>Technique ID</th>
                              <th>Description</th>
                            </tr>
                          </thead>
                          <tbody>
                            {mapping.map((m, idx) => (
                              <tr key={idx}>
                                <td><span className="badge bg-dark-subtle text-dark-emphasis">{m.tactic}</span></td>
                                <td className="fw-semibold">{m.technique}</td>
                                <td><code className="text-danger fw-bold">{m.techniqueId}</code></td>
                                <td className="text-muted">{m.description}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    {mapping && (
                      <div className="mt-3 pt-3 border-top" style={{ fontSize: "12px" }}>
                        <div className="row g-2 text-start">
                          <div className="col-md-6">
                            <span className="text-muted d-block text-uppercase fw-semibold" style={{ fontSize: "10px" }}>Framework</span>
                            <span className="text-dark fw-bold">MITRE ATT&CK</span>
                          </div>
                          <div className="col-md-6">
                            <span className="text-muted d-block text-uppercase fw-semibold" style={{ fontSize: "10px" }}>Version</span>
                            <span className="text-dark fw-bold">v15.1 (Latest supported)</span>
                          </div>
                          <div className="col-12 mt-2">
                            <span className="text-muted d-block text-uppercase fw-semibold" style={{ fontSize: "10px" }}>Purpose</span>
                            <span className="text-secondary">
                              Adversary tactics and techniques are mapped to the incident category to align mitigation strategies, aid threat scoping, and streamline reporting for security operations.
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Smart Incident Timeline */}
              <div className="soc-card mb-4 shadow-sm">
                <div className="soc-card-title fw-bold mb-3">Smart Incident Timeline</div>
                <div className="soc-timeline" style={{ paddingLeft: "10px" }}>
                  {timelineEvents.length === 0 ? (
                    <div className="text-muted text-center py-2" style={{ fontSize: "13px" }}>
                      No timeline events recorded.
                    </div>
                  ) : (
                    getCleanTimelineEvents(timelineEvents).map((evt, i) => (
                      <div key={i} className="timeline-item mb-4 position-relative text-start" style={{ paddingLeft: "24px", borderLeft: "2px solid #cbd5e1" }}>
                        <div 
                          className="position-absolute rounded-circle bg-primary shadow-sm" 
                          style={{ width: "10px", height: "10px", left: "-6px", top: "6px" }}
                        ></div>
                        <div style={{ fontSize: "13px" }}>
                          <span className="fw-bold text-dark d-block text-uppercase mb-1" style={{ fontSize: "11.5px", letterSpacing: "0.5px" }}>{evt.action}</span>
                          <p className="text-secondary m-0 mb-1" style={{ fontSize: "13px", lineHeight: "1.4" }}>{evt.remarks || "Action processed."}</p>
                          <div className="text-muted mt-1" style={{ fontSize: "11px", lineHeight: "1.4" }}>
                            <div>Time: <strong>{formatTimestamp(evt.timestamp)}</strong></div>
                            <div>Performed By: <strong>{evt.user}</strong></div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Incident Completion Summary Card */}
              {(incident.status?.toUpperCase() === "RESOLVED" || incident.status?.toUpperCase() === "CLOSED" || incident.isResolvedArchived) && (
                <div className="soc-card mb-4 shadow-sm border border-success-subtle text-start">
                  <div className="soc-card-title fw-bold mb-3 d-flex align-items-center gap-2">
                    <FaCheckCircle className="text-success" />
                    <span>Incident Completion Summary</span>
                  </div>
                  <div className="row g-3">
                    {(() => {
                      const created = new Date(incident.createdTime || incident.timestamp);
                      const resolved = incident.resolvedTime ? new Date(incident.resolvedTime) : new Date();
                      const durationMs = resolved - created;
                      const durationText = durationMs > 0 ? (durationMs / (1000 * 60 * 60)).toFixed(1) + " Hours" : "0.5 Hours";

                      const escCount = escalations ? escalations.length : 0;
                      const aiUsed = (incident.aiAssistantSummary || incident.aiAssistantRootCause) ? "Yes" : "No";

                      let checklistPct = "0%";
                      if (checklist) {
                        const total = checklist.length;
                        const completed = checklist.filter(c => c.checked).length;
                        checklistPct = total > 0 ? `${Math.round((completed / total) * 100)}% (${completed}/${total})` : "0%";
                      }

                      const iocs = extractIoCs(incident.description, incident.aiAssistantKeyIndicators);
                      const iocCount = Object.values(iocs).filter(v => v && v.trim() !== "").length;

                      const mitre = getMitreMapping(incident.category, incident.title, incident.description);
                      const mitreText = mitre ? mitre.map(m => m.techniqueId).join(", ") : "None";

                      const rootCause = incident.aiAssistantRootCause || "External Intrusion / Policy Violation";
                      const resolutionSummary = incident.resolutionSummary || "Threat contained, network segmented, credentials rotated.";
                      
                      const priority = incident.priority?.toUpperCase();
                      const businessImpact = priority === "CRITICAL" || priority === "HIGH" 
                        ? "High - Temporary disruption to department access, potential data exfiltration risk mitigated."
                        : "Low - Isolated workstation anomaly, zero business downtime reported.";

                      let lessonsLearned = "Enhance monitoring on sensitive access directories and logs.";
                      if (incident.category?.toLowerCase().includes("phish")) {
                        lessonsLearned = "Enforce multi-factor authentication (MFA) and conduct employee security awareness training.";
                      } else if (incident.category?.toLowerCase().includes("malware")) {
                        lessonsLearned = "Deploy updated host EDR policies and restrict executable file downloads.";
                      }

                      return (
                        <>
                          <div className="col-md-6 col-lg-4">
                            <small className="text-muted d-block" style={{ fontSize: "10px", fontWeight: "600" }}>INVESTIGATION DURATION</small>
                            <span className="text-dark fw-bold">{durationText}</span>
                          </div>
                          <div className="col-md-6 col-lg-4">
                            <small className="text-muted d-block" style={{ fontSize: "10px", fontWeight: "600" }}>ESCALATION COUNT</small>
                            <span className="text-dark fw-bold">{escCount}</span>
                          </div>
                          <div className="col-md-6 col-lg-4">
                            <small className="text-muted d-block" style={{ fontSize: "10px", fontWeight: "600" }}>AI USED</small>
                            <span className="text-dark fw-bold">{aiUsed}</span>
                          </div>
                          <div className="col-md-6 col-lg-4">
                            <small className="text-muted d-block" style={{ fontSize: "10px", fontWeight: "600" }}>CHECKLIST COMPLETION</small>
                            <span className="text-dark fw-bold">{checklistPct}</span>
                          </div>
                          <div className="col-md-6 col-lg-4">
                            <small className="text-muted d-block" style={{ fontSize: "10px", fontWeight: "600" }}>IOC COUNT</small>
                            <span className="text-dark fw-bold">{iocCount}</span>
                          </div>
                          <div className="col-md-6 col-lg-4">
                            <small className="text-muted d-block" style={{ fontSize: "10px", fontWeight: "600" }}>MITRE TECHNIQUES</small>
                            <span className="text-dark fw-bold">{mitreText}</span>
                          </div>
                          
                          <div className="col-12 border-top pt-2.5 mt-2">
                            <small className="text-muted d-block" style={{ fontSize: "10px", fontWeight: "600" }}>ROOT CAUSE</small>
                            <span className="text-secondary" style={{ fontSize: "13px" }}>{rootCause}</span>
                          </div>
                          <div className="col-12 mt-2">
                            <small className="text-muted d-block" style={{ fontSize: "10px", fontWeight: "600" }}>RESOLUTION SUMMARY</small>
                            <span className="text-secondary" style={{ fontSize: "13px" }}>{resolutionSummary}</span>
                          </div>
                          <div className="col-12 mt-2">
                            <small className="text-muted d-block" style={{ fontSize: "10px", fontWeight: "600" }}>BUSINESS IMPACT</small>
                            <span className="text-secondary" style={{ fontSize: "13px" }}>{businessImpact}</span>
                          </div>
                          <div className="col-12 mt-2">
                            <small className="text-muted d-block" style={{ fontSize: "10px", fontWeight: "600" }}>LESSONS LEARNED</small>
                            <span className="text-secondary" style={{ fontSize: "13px" }}>{lessonsLearned}</span>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* Analyst Notes and Resolution Panel */}
              {!incident.isResolvedArchived && (role === "ANALYST" || role === "ADMIN") && (
                <div className="soc-card mb-4 shadow-sm">
                  <div className="soc-card-title fw-bold mb-3">
                    {role === "ADMIN" ? "Administrative & Technical Control Panel" : "Analyst Work Station"}
                  </div>
 
                  {role === "ANALYST" && incident.assignedTo !== username && (
                    <div className="alert alert-warning mx-3 my-2" role="alert" style={{ fontSize: "13.5px" }}>
                      This incident has been reassigned. You have read-only access.
                    </div>
                  )}
                  
                  {role === "ANALYST" && incident.assignedTo === username ? (
                    <>
                      {/* Status update dropdown */}
                      <div className="soc-form-group mb-3">
                        <label className="soc-form-label">Workflow Status</label>
                        <select
                          className="soc-form-control"
                          value={status}
                          onChange={(e) => handleUpdateStatus(e.target.value)}
                        >
                          <option value="OPEN">Open</option>
                          <option value="UNDER_INVESTIGATION">Under Investigation</option>
                          <option value="REOPENED">Reopened</option>
                        </select>
                      </div>

                      {/* Notes */}
                      <div className="soc-form-group mb-3">
                        <label className="soc-form-label">Technical Investigation Notes & Findings</label>
                        <textarea
                          rows="4"
                          className="soc-form-control"
                          placeholder="Input live threat logs, packet dumps, or findings..."
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                        />
                        <button onClick={handleSaveNotes} className="btn btn-sm btn-outline-primary mt-2">
                          Save Notes
                        </button>
                      </div>

                      {/* Resolution submission */}
                      <div className="soc-form-group">
                        <label className="soc-form-label">Resolution Summary</label>
                        <textarea
                          rows="3"
                          className="soc-form-control"
                          placeholder="Specify how this security breach/incident was mitigated..."
                          value={resolution}
                          onChange={(e) => setResolution(e.target.value)}
                        />
                        <button onClick={handleSubmitResolution} className="btn btn-soc btn-soc-primary mt-2">
                          Submit Resolution for Approval
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Read-Only Status */}
                      <div className="soc-form-group mb-3">
                        <label className="soc-form-label fw-bold">Incident Workflow Status</label>
                        <div className="bg-light p-2.5 rounded border text-dark fw-semibold" style={{ fontSize: "14px" }}>
                          {status || "Open"}
                        </div>
                      </div>

                      {/* Read-Only Technical Notes */}
                      <div className="soc-form-group mb-3">
                        <label className="soc-form-label fw-bold">Technical Investigation Notes & Findings</label>
                        <div className="bg-light p-3 rounded border text-muted" style={{ minHeight: "80px", whiteSpace: "pre-wrap", fontSize: "13.5px" }}>
                          {incident.analystNotes || "No technical notes entered by analyst yet."}
                        </div>
                      </div>

                      {/* Read-Only Resolution Summary */}
                      <div className="soc-form-group mb-3">
                        <label className="soc-form-label fw-bold">Analyst Resolution Summary</label>
                        <div className="bg-light p-3 rounded border text-muted" style={{ minHeight: "60px", whiteSpace: "pre-wrap", fontSize: "13.5px" }}>
                          {incident.resolutionSummary || "No resolution details submitted yet."}
                        </div>
                      </div>

                      {/* Editable Administrative Remarks */}
                      {role === "ADMIN" ? (
                        <div className="soc-form-group">
                          <label className="soc-form-label fw-bold">Administrative Remarks</label>
                          <textarea
                            rows="3"
                            className="soc-form-control"
                            placeholder="Enter management comments, policy reviews, or oversight logs..."
                            value={adminRemarks}
                            onChange={(e) => setAdminRemarks(e.target.value)}
                          />
                          <button onClick={handleSaveRemarks} className="btn btn-sm btn-outline-primary mt-2">
                            Save Administrative Remarks
                          </button>
                        </div>
                      ) : (
                        incident.adminRemarks && (
                          <div className="soc-form-group">
                            <label className="soc-form-label fw-bold">Administrative Remarks</label>
                            <div className="bg-light p-3 rounded border text-muted" style={{ minHeight: "60px", whiteSpace: "pre-wrap", fontSize: "13.5px" }}>
                              {incident.adminRemarks}
                            </div>
                          </div>
                        )
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Archived Resolution info */}
              {(incident.isResolvedArchived || incident.status?.toUpperCase() === "CLOSED") && (
                <div className="soc-card mb-4 border-success shadow-sm">
                  <div className="soc-card-title text-success fw-bold mb-3">Incident Resolution Details</div>
                  <div className="mb-3">
                    <small className="text-muted d-block text-uppercase" style={{ fontSize: "11px", fontWeight: "600" }}>Approved By</small>
                    <strong className="text-dark">{incident.approvedBy || "Admin"}</strong>
                  </div>
                  <div className="mb-3">
                    <small className="text-muted d-block text-uppercase" style={{ fontSize: "11px", fontWeight: "600" }}>Resolution Summary</small>
                    <div className="bg-success-subtle p-3 rounded text-dark mt-1 border border-success" style={{ fontSize: "14px", whiteSpace: "pre-wrap" }}>
                      {incident.resolutionSummary || "Resolved successfully."}
                    </div>
                  </div>
                  {incident.adminRemarks && (
                    <div>
                      <small className="text-muted d-block text-uppercase" style={{ fontSize: "11px", fontWeight: "600" }}>Administrative Remarks</small>
                      <div className="bg-light p-3 rounded text-dark mt-1 border border-light" style={{ fontSize: "14px", whiteSpace: "pre-wrap" }}>
                        {incident.adminRemarks}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Rejection Notes panel */}
              {incident.rejectionReason && (
                <div className="soc-card mb-4 border-danger shadow-sm">
                  <div className="soc-card-title text-danger fw-bold mb-3">Resolution Rejected</div>
                  <div>
                    <small className="text-muted d-block text-uppercase" style={{ fontSize: "11px", fontWeight: "600" }}>Rejection Feedback</small>
                    <div className="bg-danger-subtle p-3 rounded text-dark mt-1 border border-danger" style={{ fontSize: "14px" }}>
                      {incident.rejectionReason}
                    </div>
                  </div>
                </div>
              )}

              {/* Attachments Section */}
              <div className="soc-card shadow-sm">
                <div className="soc-card-title d-flex justify-content-between align-items-center fw-bold mb-3">
                  <span>File Evidence (Uploaded Attachments)</span>
                  {!incident.isResolvedArchived && (role === "ADMIN" || role === "EMPLOYEE" || (role === "ANALYST" && incident.assignedTo === username)) && (
                    <button onClick={() => fileInputRef.current.click()} className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1.5" disabled={uploading}>
                      <FaFileUpload /> Upload File
                    </button>
                  )}
                  <input
                    type="file"
                    ref={fileInputRef}
                    style={{ display: "none" }}
                    onChange={handleFileUpload}
                  />
                </div>

                <div className="d-flex flex-column gap-2 mt-2">
                  {attachments.length === 0 ? (
                    <p className="text-muted text-center m-0 py-3" style={{ fontSize: "14px" }}>
                      No attachments uploaded for this incident.
                    </p>
                  ) : (
                    attachments.map(att => (
                      <div key={att.id} className="d-flex align-items-center justify-content-between p-2 rounded border bg-light">
                        <div className="d-flex align-items-center gap-2">
                          <FaFileAlt style={{ color: "#0d6efd" }} />
                          <div>
                            <span className="fw-semibold text-dark d-block" style={{ fontSize: "13px" }}>{att.filename}</span>
                            <small className="text-muted" style={{ fontSize: "11px" }}>Uploaded by {att.uploadedBy} | {att.uploadTime}</small>
                          </div>
                        </div>
                        <div className="d-flex gap-2">
                          {att.fileType && att.fileType.startsWith("image/") && (
                            <button 
                              type="button"
                              onClick={() => handlePreviewAttachment(att.id)}
                              className="btn btn-sm btn-outline-info"
                              style={{ fontSize: "11px" }}
                            >
                              Preview
                            </button>
                          )}
                          <button 
                            type="button"
                            onClick={() => handleDownloadAttachment(att.id, att.filename)}
                            className="btn btn-sm btn-primary"
                            style={{ fontSize: "11px" }}
                          >
                            Download
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Right side SLA / Info panel */}
            <div className="col-lg-4">
              {/* SLA Countdown Card */}
              {!incident.isResolvedArchived && incident.status?.toUpperCase() !== "CLOSED" && (
                <div className={`soc-card mb-4 text-start shadow-sm border ${slaBreached ? "border-danger-subtle" : "border-warning-subtle"}`}>
                  <div className="soc-card-title fw-bold mb-3 d-flex justify-content-between align-items-center">
                    <span>SLA Performance Panel</span>
                    {slaBreached ? (
                      <span className="badge bg-danger text-white">SLA BREACHED</span>
                    ) : (
                      <span className="badge bg-success text-white">SLA COMPLIANT</span>
                    )}
                  </div>
                  
                  {(() => {
                    const statusText = slaBreached ? "SLA Breached" : "Active";
                    const statusBadgeColor = slaBreached ? "bg-danger" : "bg-success";
                    
                    const remTime = slaBreached ? "00:00:00" : slaRemainingText;
                    const elapsed = slaBreached ? `Breached: ${slaBreachTimeText}` : slaElapsedText;
                    
                    const pctVal = slaBreached ? 100 : Math.round(slaProgress);
                    let utilBadgeColor = "bg-success";
                    if (pctVal > 95) utilBadgeColor = "bg-danger";
                    else if (pctVal >= 80) utilBadgeColor = "bg-warning text-dark";
                    
                    return (
                      <div className="d-flex flex-column gap-2.5" style={{ fontSize: "13px" }}>
                        <div className="d-flex justify-content-between align-items-center border-bottom pb-2">
                          <span className="text-secondary fw-semibold">SLA Status</span>
                          <span className={`badge ${statusBadgeColor}`}>{statusText}</span>
                        </div>
                        <div className="d-flex justify-content-between align-items-center border-bottom pb-2">
                          <span className="text-secondary fw-semibold">Remaining Time</span>
                          <strong style={{ color: slaBreached ? "#dc3545" : "#0d6efd" }}>{remTime}</strong>
                        </div>
                        <div className="d-flex justify-content-between align-items-center border-bottom pb-2">
                          <span className="text-secondary fw-semibold">Elapsed Time</span>
                          <strong>{elapsed}</strong>
                        </div>
                        <div className="d-flex justify-content-between align-items-center border-bottom pb-2">
                          <span className="text-secondary fw-semibold">SLA Utilization</span>
                          <span className={`badge ${utilBadgeColor}`}>{pctVal}%</span>
                        </div>
                        <div className="d-flex justify-content-between align-items-center">
                          <span className="text-secondary fw-semibold">Deadline</span>
                          <strong className="text-dark" style={{ fontSize: "12px" }}>
                            {incident.slaDeadline ? formatTimestamp(incident.slaDeadline) : "N/A"}
                          </strong>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Dynamic Investigation Checklist */}
              <div className="soc-card mb-4 shadow-sm border border-success-subtle text-start">
                <div className="soc-card-title fw-bold mb-3 d-flex align-items-center gap-2">
                  <FaListUl className="text-success" />
                  <span>Investigation Checklist</span>
                </div>
                <div className="mb-3 text-start">
                  {(() => {
                    const total = checklist.length;
                    const completed = checklist.filter(c => c.checked).length;
                    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
                    return (
                      <div className="d-flex flex-column gap-2 mb-3 bg-light p-2.5 rounded border border-success-subtle" style={{ fontSize: "13px" }}>
                        <div className="d-flex justify-content-between align-items-center">
                          <span className="text-secondary fw-semibold">Completed Tasks</span>
                          <strong className="text-dark">{completed} of {total}</strong>
                        </div>
                        <div className="d-flex justify-content-between align-items-center">
                          <span className="text-secondary fw-semibold">Progress</span>
                          <strong className="text-dark">{pct}%</strong>
                        </div>
                      </div>
                    );
                  })()}
                </div>
                <div className="d-flex flex-column text-start">
                  {checklist.map((item, idx) => (
                    <div 
                      key={idx} 
                      className="d-flex align-items-start gap-2 py-2 border-bottom text-start"
                      style={{ fontSize: "13px", cursor: incident.isResolvedArchived ? "default" : "pointer", userSelect: "none" }}
                      onClick={() => !incident.isResolvedArchived && handleToggleChecklist(idx)}
                    >
                      <span className="fw-bold text-success" style={{ fontSize: "15px", lineHeight: "1" }}>
                        {item.checked ? "☑" : "☐"}
                      </span>
                      <div className="d-flex flex-column text-start">
                        <span style={{ textDecoration: item.checked ? "line-through text-muted" : "none", color: item.checked ? "#6c757d" : "#212529" }}>
                          {item.item}
                        </span>
                        {item.checked && item.completedBy && (
                          <small className="text-muted mt-0.5" style={{ fontSize: "10.5px" }}>
                            Completed by: <strong>{item.completedBy}</strong> | {item.completedTime}
                          </small>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Employee Information Card */}
              {reporterUser && (
                <div className="soc-card mb-4 shadow-sm">
                  <div className="soc-card-title fw-bold mb-3">Employee Information</div>
                  <div className="d-flex align-items-center gap-3 mb-3 border-bottom pb-3">
                    {reporterUser.profileImage ? (
                      <img
                        src={`${window.API_BASE_URL}${reporterUser.profileImage}`}
                        alt="Profile"
                        className="rounded-circle border"
                        style={{ width: "50px", height: "50px", objectFit: "cover" }}
                      />
                    ) : (
                      <div 
                        className="rounded-circle bg-secondary d-flex align-items-center justify-content-center text-white fw-bold"
                        style={{ width: "50px", height: "50px", fontSize: "20px" }}
                      >
                        {(reporterUser.fullName || reporterUser.username || "?").charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <h6 className="m-0 fw-bold text-dark" style={{ fontSize: "15px" }}>{reporterUser.fullName || "N/A"}</h6>
                      <small className="text-muted text-uppercase" style={{ fontSize: "10px" }}>{reporterUser.role || "EMPLOYEE"}</small>
                    </div>
                  </div>
                  <div className="d-flex flex-column gap-3 text-start" style={{ fontSize: "13.5px" }}>
                    <div>
                      <small className="text-muted d-block text-uppercase fw-semibold mb-1" style={{ fontSize: "10px" }}>Department</small>
                      <strong className="text-dark d-block">{reporterUser.department || "N/A"}</strong>
                    </div>
                    <div>
                      <small className="text-muted d-block text-uppercase fw-semibold mb-1" style={{ fontSize: "10px" }}>Email Address</small>
                      <strong className="text-dark d-block" style={{ wordBreak: "break-all" }}>{reporterUser.email || "N/A"}</strong>
                    </div>
                    <div>
                      <small className="text-muted d-block text-uppercase fw-semibold mb-1" style={{ fontSize: "10px" }}>Phone Number</small>
                      <strong className="text-dark d-block">{reporterUser.phone || "N/A"}</strong>
                    </div>
                  </div>
                </div>
              )}

              {/* Status and Priority Summary Card */}
              <div className="soc-card mb-4 shadow-sm">
                <div className="soc-card-title fw-bold mb-3">Telemetry Summary</div>
                <div className="d-flex flex-column gap-3">
                  <div>
                    <small className="text-muted text-uppercase" style={{ fontSize: "10px", fontWeight: "600" }}>Current Status</small>
                    <h5 className="m-0 mt-1 fw-bold text-dark">{incident.status}</h5>
                  </div>
                  <div>
                    <small className="text-muted text-uppercase" style={{ fontSize: "10px", fontWeight: "600" }}>Priority</small>
                    <div className="mt-1">
                      <span className={`badge-status ${
                        incident.priority === 'Critical' ? 'bg-danger-subtle text-danger' :
                        incident.priority === 'High' ? 'bg-warning-subtle text-warning' :
                        incident.priority === 'Medium' ? 'bg-primary-subtle text-primary' : 'bg-success-subtle text-success'
                      }`}>
                        {incident.priority || "Medium"}
                      </span>
                    </div>
                  </div>
                  {incident.recommendedPriority && (
                    <div>
                      <small className="text-muted text-uppercase" style={{ fontSize: "10px", fontWeight: "600" }}>AI Recommended Priority</small>
                      <div className="mt-1">
                        <span className="badge bg-light text-dark border">{incident.recommendedPriority}</span>
                      </div>
                      <div className="mt-1.5" style={{ fontSize: "12.5px", fontWeight: "600" }}>
                        {incident.priority?.toLowerCase() !== incident.recommendedPriority?.toLowerCase() ? (
                          <span className="text-danger">⚠ AI recommends a higher priority than the current incident priority.</span>
                        ) : (
                          <span className="text-success">✓ Current priority matches AI recommendation.</span>
                        )}
                      </div>
                    </div>
                  )}
                  {incident.routingConfidence !== undefined && incident.routingConfidence !== null && (
                    <div>
                      <small className="text-muted text-uppercase" style={{ fontSize: "10px", fontWeight: "600" }}>AI Routing Confidence</small>
                      <div className="mt-1 d-flex align-items-center gap-2">
                        <span className={`badge bg-${
                          incident.routingConfidence > 80 ? 'success' :
                          incident.routingConfidence >= 50 ? 'warning' : 'danger'
                        } text-white`}>
                          {incident.routingConfidence}%
                        </span>
                        <small className="text-muted fw-semibold" style={{ fontSize: "11px" }}>
                          {incident.routingConfidence > 80 ? 'High Confidence' :
                           incident.routingConfidence >= 50 ? 'Moderate Confidence' : 'Low Confidence'}
                        </small>
                      </div>
                    </div>
                  )}
                  <div>
                    <small className="text-muted text-uppercase" style={{ fontSize: "10px", fontWeight: "600" }}>Assigned Analyst</small>
                    <div className="d-flex align-items-center gap-2 mt-1">
                      {assignedUser && assignedUser.profileImage ? (
                        <img
                          src={`${window.API_BASE_URL}${assignedUser.profileImage}`}
                          alt="Analyst"
                          className="rounded-circle border"
                          style={{ width: "28px", height: "28px", objectFit: "cover" }}
                        />
                      ) : (
                        <div 
                          className="rounded-circle bg-secondary d-flex align-items-center justify-content-center text-white fw-bold"
                          style={{ width: "28px", height: "28px", fontSize: "12px" }}
                        >
                          {(incident.assignedAnalystName || "U").charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="fw-semibold m-0 text-dark" style={{ lineHeight: "1.2" }}>
                          {assignedUser?.fullName || incident.assignedAnalystName || (
                            incident.status === "PENDING_ASSIGNMENT" ? "No suitable analyst found" : "Unassigned"
                          )}
                          {incident.assignedTo?.toLowerCase() === "management review" ? " (N/A)" : (
                            assignedUser && assignedUser.analystLevel && (
                              ` (${assignedUser.analystLevel.includes("Analyst") ? assignedUser.analystLevel : `${assignedUser.analystLevel} Analyst`})`
                            )
                          )}
                        </p>
                        <small className="text-muted">
                          {incident.status?.toUpperCase() === "MANAGEMENT_REVIEW" || incident.assignedTo?.toLowerCase() === "management review" ? "Management" : (
                            assignedUser?.analystLevel || (incident.escalationLevel ? `Level ${incident.escalationLevel}` : "Level L1")
                          )}
                        </small>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Escalation history audit list */}
              <div className="soc-card mb-4 shadow-sm">
                <div className="soc-card-title fw-bold mb-3">Escalation Chain</div>
                {(() => {
                  const currentAssigned = incident.assignedTo || "";
                  const currentLevel = getAnalystLevel(currentAssigned, usersList);
                    
                    let currentOwnerLabel = "Employee";
                    if (currentAssigned.toLowerCase() === "management review") {
                      currentOwnerLabel = "Management Review";
                    } else if (currentLevel === "L3 Analyst" || currentLevel.includes("L3")) {
                      currentOwnerLabel = "L3 Analyst";
                    } else if (currentLevel === "L2 Analyst" || currentLevel.includes("L2")) {
                      currentOwnerLabel = "L2 Analyst";
                    } else if (currentLevel === "L1 Analyst" || currentLevel.includes("L1") || currentAssigned === "kowsi") {
                      currentOwnerLabel = "L1 Analyst";
                    } else if (incident.status?.toUpperCase() === "RESOLVED" || incident.status?.toUpperCase() === "CLOSED" || incident.isResolvedArchived) {
                      currentOwnerLabel = "Management Review";
                    }

                    const steps = [
                      { label: "Employee", name: incident.reportedBy || "Reporter" },
                      { label: "L1 Analyst", name: getActualAnalystForLevel("L1", "kowsi") },
                      { label: "L2 Analyst", name: getActualAnalystForLevel("L2", "sumathi") },
                      { label: "L3 Analyst", name: getActualAnalystForLevel("L3", "arun") },
                      { label: "Management Review", name: "Management Review Team" }
                    ];

                    return (
                      <div className="d-flex flex-column align-items-center gap-2 mb-3 w-100">
                        {steps.map((step, idx) => {
                          const isCurrent = step.label === currentOwnerLabel;
                          return (
                            <React.Fragment key={idx}>
                              {idx > 0 && <span className="text-secondary fw-bold my-1" style={{ fontSize: "16px" }}>↓</span>}
                              <div 
                                className="card bg-white p-2.5 w-100 text-center shadow-none" 
                                style={{ 
                                  border: isCurrent ? "2px solid #198754" : "1px solid #dee2e6",
                                  borderRadius: "6px",
                                  backgroundColor: isCurrent ? "#f1fbf5" : "#ffffff"
                                }}
                              >
                                <small className={`text-uppercase fw-bold ${isCurrent ? "text-success" : "text-muted"}`} style={{ fontSize: "9.5px", letterSpacing: "0.5px" }}>
                                  {step.label}
                                </small>
                                <div className={`fw-bold mt-0.5 ${isCurrent ? "text-success" : "text-dark"}`} style={{ fontSize: "13px" }}>
                                  {step.name}
                                </div>
                              </div>
                            </React.Fragment>
                          );
                        })}
                      </div>
                    );
                  })()}
                <div className="soc-timeline">
                  {incident.assignedTo ? (
                    <div className="timeline-item mb-3 position-relative" style={{ paddingLeft: "15px", borderLeft: "2px solid #e2e8f0" }}>
                      <div 
                        className="position-absolute rounded-circle bg-primary" 
                        style={{ width: "8px", height: "8px", left: "-5px", top: "6px" }}
                      ></div>
                      <div style={{ fontSize: "12.5px" }}>
                        <span className="fw-semibold text-dark d-block">
                          Assigned to {
                            incident.assignedTo.toLowerCase() === "management review" 
                              ? "Management Review" 
                              : (assignedUser && assignedUser.analystLevel 
                                  ? (assignedUser.analystLevel.includes("Analyst") ? assignedUser.analystLevel : `${assignedUser.analystLevel} Analyst`) 
                                  : "L1 Analyst")
                          }
                        </span>
                        <span className="text-secondary mt-0.5 d-block" style={{ fontSize: "11.5px" }}>
                          Analyst: <strong>{incident.assignedAnalystName || incident.assignedTo}</strong>
                        </span>
                        {incident.assignedTo.toLowerCase() !== "management review" && (
                          <span className="text-secondary mt-0.5 d-block" style={{ fontSize: "11.5px" }}>
                            Assignment Type: <strong>{
                              (() => {
                                const matched = assignments && assignments.find(ass => ass.assignedTo === incident.assignedTo);
                                return matched ? (matched.override ? "Manual Override" : "Automatic") : "Automatic";
                              })()
                            }</strong>
                          </span>
                        )}
                        <small className="text-muted d-block mt-0.5" style={{ fontSize: "11px" }}>
                          Assigned Time: {formatTimestamp(incident.assignedTime || incident.timestamp)}
                        </small>
                        {incident.assignmentFinalScore !== undefined && incident.assignmentFinalScore !== null && (
                          <div className="mt-2">
                            <details className="mt-1 border rounded p-2 bg-light">
                              <summary className="fw-bold cursor-pointer text-primary" style={{ fontSize: "11.5px", outline: "none" }}>
                                Assignment Decision Details
                              </summary>
                              <div className="mt-2" style={{ fontSize: "11.5px" }}>
                                <div className="d-flex justify-content-between mb-1">
                                  <span>Specialization Match:</span>
                                  <strong>{incident.assignmentSpecScore !== null ? incident.assignmentSpecScore.toFixed(0) : "0"}</strong>
                                </div>
                                <div className="d-flex justify-content-between mb-1">
                                  <span>Workload Score:</span>
                                  <strong>{incident.assignmentWorkloadScore !== null ? incident.assignmentWorkloadScore.toFixed(0) : "0"}</strong>
                                </div>
                                <div className="d-flex justify-content-between mb-1">
                                  <span>Performance Score:</span>
                                  <strong>{incident.assignmentPerfScore !== null ? incident.assignmentPerfScore.toFixed(1) : "0.0"}</strong>
                                </div>
                                <div className="d-flex justify-content-between border-top pt-1 mb-1">
                                  <span>Final Assignment Score:</span>
                                  <strong className="text-purple" style={{ color: "#6f42c1" }}>
                                    {incident.assignmentFinalScore !== null ? incident.assignmentFinalScore.toFixed(2) : "0.00"}
                                  </strong>
                                </div>
                                <div className="mt-1.5 pt-1.5 border-top">
                                  <span className="text-muted d-block" style={{ fontSize: "10.5px" }}>Assignment Reason:</span>
                                  <span className="fw-semibold text-dark">{incident.assignmentReason || "No details provided."}</span>
                                </div>
                              </div>
                            </details>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-muted text-center m-0 py-2" style={{ fontSize: "13px" }}>
                      Incident is currently pending assignment.
                    </p>
                  )}

                  {/* Escalation Steps */}
                  {escalations.length === 0 && (incident.escalationLevel === "L2" || (assignedUser && assignedUser.analystLevel === "L2")) ? (
                    <div className="timeline-item mb-3 position-relative" style={{ paddingLeft: "15px", borderLeft: "2px solid #e2e8f0" }}>
                      <div 
                        className="position-absolute rounded-circle bg-warning" 
                        style={{ width: "8px", height: "8px", left: "-5px", top: "6px" }}
                      ></div>
                      <div style={{ fontSize: "12.5px" }}>
                        <span className="fw-semibold text-dark d-block">Escalated from: {getActualAnalystForLevel("L1", "kowsi")} (L1)</span>
                        <span className="text-secondary mt-0.5 d-block" style={{ fontSize: "11.5px" }}>
                          Assigned to: <strong>{incident.assignedTo} (L2)</strong>
                        </span>
                        <span className="text-muted mt-0.5 d-block" style={{ fontSize: "11.5px" }}>
                          Reason: SLA Breach / Manual Override
                        </span>
                        <small className="text-muted d-block mt-0.5" style={{ fontSize: "11px" }}>
                          Escalated Time: {formatTimestamp(incident.assignedTime || incident.timestamp)} (Manual Override)
                        </small>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Step 2: L2 Escalation */}
                      {escalations.filter(e => e.newLevel === "L2").map((esc, idx) => {
                        const fromAnalyst = getActualAnalystForLevel("L1", esc.oldAnalyst === "sumathi" ? "kowsi" : esc.oldAnalyst);
                        const toAnalyst = esc.newAnalyst;
                        return (
                          <div key={`l2-${idx}`} className="timeline-item mb-3 position-relative" style={{ paddingLeft: "15px", borderLeft: "2px solid #e2e8f0" }}>
                            <div 
                              className="position-absolute rounded-circle bg-warning" 
                              style={{ width: "8px", height: "8px", left: "-5px", top: "6px" }}
                            ></div>
                            <div style={{ fontSize: "12.5px" }}>
                              <span className="fw-semibold text-dark d-block">Escalated from: {fromAnalyst} (L1)</span>
                              <span className="text-secondary mt-0.5 d-block" style={{ fontSize: "11.5px" }}>
                                Assigned to: <strong>{toAnalyst} (L2)</strong>
                              </span>
                              <span className="text-muted mt-0.5 d-block" style={{ fontSize: "11.5px" }}>
                                Reason: {esc.reason}
                              </span>
                              <small className="text-muted d-block mt-0.5" style={{ fontSize: "11px" }}>
                                Escalated Time: {formatTimestamp(esc.escalatedTime)} ({esc.triggeredBy})
                              </small>
                            </div>
                          </div>
                        );
                      })}

                      {/* Step 3: L3 Escalation */}
                      {escalations.filter(e => e.newLevel === "L3").map((esc, idx) => {
                        const fromAnalyst = getActualAnalystForLevel("L2", esc.oldAnalyst === "sumathi" ? "sumathi" : esc.oldAnalyst);
                        const toAnalyst = esc.newAnalyst;
                        return (
                          <div key={`l3-${idx}`} className="timeline-item mb-3 position-relative" style={{ paddingLeft: "15px", borderLeft: "2px solid #e2e8f0" }}>
                            <div 
                              className="position-absolute rounded-circle bg-danger" 
                              style={{ width: "8px", height: "8px", left: "-5px", top: "6px" }}
                            ></div>
                            <div style={{ fontSize: "12.5px" }}>
                              <span className="fw-semibold text-dark d-block">Escalated from: {fromAnalyst} (L2)</span>
                              <span className="text-secondary mt-0.5 d-block" style={{ fontSize: "11.5px" }}>
                                Assigned to: <strong>{toAnalyst} (L3)</strong>
                              </span>
                              <span className="text-muted mt-0.5 d-block" style={{ fontSize: "11.5px" }}>
                                Reason: {esc.reason}
                              </span>
                              <small className="text-muted d-block mt-0.5" style={{ fontSize: "11px" }}>
                                Escalated Time: {formatTimestamp(esc.escalatedTime)} ({esc.triggeredBy})
                              </small>
                            </div>
                          </div>
                        );
                      })}
                    </>
                  )}
                </div>
              </div>

              {/* Assignment History audit list */}
              <div className="soc-card mb-4 shadow-sm">
                <div className="soc-card-title fw-bold mb-3">Assignment History</div>
                <div>
                  {assignments.length === 0 ? (
                    <p className="text-muted text-center m-0 py-2" style={{ fontSize: "13px" }}>
                      No assignment history recorded for this incident.
                    </p>
                  ) : (
                    (() => {
                      const cleaned = [];
                      const sorted = [...assignments].sort((a, b) => new Date(a.assignmentTime) - new Date(b.assignmentTime));
                      
                      sorted.forEach(ass => {
                        const target = ass.assignedTo || "";
                        if (cleaned.length > 0 && cleaned[cleaned.length - 1].assignedTo === target) {
                          return;
                        }
                        cleaned.push(ass);
                      });
                      
                      return cleaned.map((ass, i) => {
                        const isMR = ass.assignedTo?.toLowerCase() === "management review";
                        const displayName = isMR ? "Management Review" : (ass.assignedToName || ass.assignedTo);
                        const roleLevel = isMR ? "Management" : getAnalystLevel(ass.assignedTo, usersList);
                        
                        const type = ass.assignmentType || (ass.override ? "Override" : (ass.assignedBy?.toLowerCase() === "system" ? "Automatic" : (ass.assignedBy?.toLowerCase() === "ai" ? "AI" : "Manual")));
                        const reason = ass.reason || (ass.override ? "Specialization mismatch override" : (ass.assignedBy?.toLowerCase() === "system" ? "Automatic Category Specialization assignment" : "Manual analyst assignment"));
                        return (
                          <div className="card mb-3 border bg-white text-start shadow-none" key={i} style={{ fontSize: "12.5px" }}>
                            <div className="card-body p-3 d-flex flex-column gap-3">
                              <div>
                                <span className="text-muted d-block text-uppercase fw-semibold mb-1" style={{ fontSize: "9px" }}>Assigned To</span>
                                <strong className="text-dark d-block">{displayName} ({roleLevel})</strong>
                              </div>
                              <div>
                                <span className="text-muted d-block text-uppercase fw-semibold mb-1" style={{ fontSize: "9px" }}>Assigned By</span>
                                <strong className="text-secondary d-block">{ass.assignedBy}</strong>
                              </div>
                              <div>
                                <span className="text-muted d-block text-uppercase fw-semibold mb-1" style={{ fontSize: "9px" }}>Assignment Type</span>
                                <strong className="text-secondary d-block">{type}</strong>
                              </div>
                              <div>
                                <span className="text-muted d-block text-uppercase fw-semibold mb-1" style={{ fontSize: "9px" }}>Reason</span>
                                <span className="text-secondary d-block">{reason}</span>
                              </div>
                              <div>
                                <span className="text-muted d-block text-uppercase fw-semibold mb-1" style={{ fontSize: "9px" }}>Time</span>
                                <strong className="text-secondary d-block" style={{ fontSize: "12.5px" }}>{formatTimestamp(ass.assignmentTime)}</strong>
                              </div>
                            </div>
                          </div>
                        );
                      });
                    })()
                  )}
                </div>
              </div>

              {/* Related Incidents Card */}
              <div className="soc-card mb-4 shadow-sm text-start">
                <div className="soc-card-title fw-bold mb-3 d-flex align-items-center gap-2">
                  <FaBriefcase className="text-primary" />
                  <span>Related Incidents</span>
                </div>
                      {(() => {
                   const relatedList = [];
                   const currentIocs = extractIoCs(incident.description, incident.aiAssistantKeyIndicators);
                   const currentUsername = (incident.description && incident.description.toLowerCase().includes("jeeva") ? "jeeva" : incident.reportedBy);

                   allIncidents.forEach(i => {
                     if (String(i.id) === String(incident.id)) return;
                     
                     const iIocs = extractIoCs(i.description, i.aiAssistantKeyIndicators);
                     const iUsername = (i.description && i.description.toLowerCase().includes("jeeva") ? "jeeva" : i.reportedBy);

                     // Check matches in order of strength
                     if (currentIocs.hash && iIocs.hash && currentIocs.hash.toLowerCase() === iIocs.hash.toLowerCase()) {
                       relatedList.push({ incident: i, reason: "Same File Hash", pct: 99 });
                     } else if (currentIocs.email && iIocs.email && currentIocs.email.toLowerCase() === iIocs.email.toLowerCase()) {
                       relatedList.push({ incident: i, reason: "Same Email Address", pct: 95 });
                     } else if (currentUsername && iUsername && currentUsername.toLowerCase() === iUsername.toLowerCase()) {
                       relatedList.push({ incident: i, reason: "Same Username", pct: 92 });
                     } else if (currentIocs.externalIp && iIocs.externalIp && currentIocs.externalIp === iIocs.externalIp) {
                       relatedList.push({ incident: i, reason: "Same External IP", pct: 89 });
                     } else if (currentIocs.internalIp && iIocs.internalIp && currentIocs.internalIp === iIocs.internalIp) {
                       relatedList.push({ incident: i, reason: "Same Internal IP", pct: 88 });
                     } else if (currentIocs.domain && iIocs.domain && currentIocs.domain.toLowerCase() === iIocs.domain.toLowerCase()) {
                       relatedList.push({ incident: i, reason: "Same Domain Name", pct: 85 });
                     } else if (currentIocs.device && iIocs.device && currentIocs.device.toLowerCase() === iIocs.device.toLowerCase()) {
                       relatedList.push({ incident: i, reason: "Same Device Name", pct: 80 });
                     } else if (i.reportedBy && incident.reportedBy && i.reportedBy === incident.reportedBy) {
                       relatedList.push({ incident: i, reason: "Same Reporter", pct: 75 });
                     } else if (i.category && incident.category && i.category === incident.category) {
                       relatedList.push({ incident: i, reason: "Same Category", pct: 70 });
                     }
                   });

                   // Sort by similarity percentage descending, take top 5
                   const sortedRelated = relatedList.sort((a, b) => b.pct - a.pct).slice(0, 5);

                   if (sortedRelated.length === 0) {
                     return (
                       <div className="text-muted text-center py-4 d-flex flex-column align-items-center justify-content-center gap-2">
                         <FaInfoCircle className="text-secondary" style={{ fontSize: "20px" }} />
                         <strong className="d-block text-secondary" style={{ fontSize: "14px" }}>No Related Incidents Found</strong>
                         <span className="d-block text-muted mt-1" style={{ fontSize: "12px", maxWidth: "280px" }}>
                           No incidents currently match the IoCs, attack pattern, affected asset, or reporter.
                         </span>
                       </div>
                     );
                   }

                   return (
                     <div className="list-group list-group-flush text-start">
                       {sortedRelated.map(({ incident: r, reason, pct }) => (
                         <Link
                           to={`/incidents/${r.id}`}
                           key={r.id}
                           className="list-group-item list-group-item-action p-2.5 d-flex flex-column gap-1 text-decoration-none border-0 border-bottom"
                           style={{ fontSize: "12.5px" }}
                         >
                           <div className="d-flex justify-content-between align-items-center">
                             <strong className="text-primary">INC-{String(r.id).padStart(6, '0')}</strong>
                             <span className="badge bg-primary-subtle text-primary fw-bold" style={{ fontSize: "11px" }}>
                               {pct}% Similarity
                             </span>
                           </div>
                           <div className="text-dark fw-semibold text-truncate">{r.title}</div>
                           <div className="d-flex justify-content-between align-items-center text-muted mt-0.5" style={{ fontSize: "11px" }}>
                             <span>Reason: <strong>{reason}</strong></span>
                             <span className={`badge ${
                               r.status?.toUpperCase() === 'CLOSED' ? 'bg-secondary text-white' :
                               r.status?.toUpperCase() === 'RESOLVED' ? 'bg-success text-white' : 'bg-warning text-dark'
                             }`} style={{ fontSize: "10px" }}>
                               {r.status || "Open"}
                             </span>
                           </div>
                         </Link>
                       ))}
                     </div>
                   );
                })()}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Custom Approve Modal Overlay */}
      {showApproveModal && (
        <div className="modal-backdrop-custom animate-fade-in" style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: "rgba(15, 23, 42, 0.65)", backdropFilter: "blur(4px)",
          zIndex: 1050, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px"
        }}>
          <div className="card bg-white p-4 text-start shadow-lg animate-scale-up" style={{ maxWidth: "500px", width: "100%", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
            <h4 className="fw-bold text-dark mb-2">Approve &amp; Close Incident</h4>
            <p className="text-secondary mb-3" style={{ fontSize: "14px", lineHeight: "1.5" }}>
              Are you sure you want to approve the resolution and close this incident? This action will move the incident to the Resolved Archive and notify the analyst and reporter.
            </p>
            <div className="mb-3">
              <label className="text-muted text-uppercase fw-semibold mb-1" style={{ fontSize: "10px", letterSpacing: "0.5px" }}>Admin Remarks (Optional)</label>
              <textarea 
                className="soc-form-control w-100 p-2.5" 
                rows="3" 
                placeholder="Enter remarks or approval notes..." 
                value={adminRemarks} 
                onChange={(e) => setAdminRemarks(e.target.value)} 
                style={{ fontSize: "13.5px", borderRadius: "6px", border: "1px solid #cbd5e1" }}
              />
            </div>
            <div className="d-flex justify-content-end gap-2 mt-4">
              <button 
                onClick={() => setShowApproveModal(false)} 
                className="btn btn-outline-secondary px-3 py-1.5 fw-semibold"
                style={{ fontSize: "13px" }}
              >
                Cancel
              </button>
              <button 
                onClick={submitApprove} 
                className="btn btn-success px-3 py-1.5 fw-semibold"
                style={{ fontSize: "13px" }}
              >
                Approve
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Reject Modal Overlay */}
      {showRejectModal && (
        <div className="modal-backdrop-custom animate-fade-in" style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: "rgba(15, 23, 42, 0.65)", backdropFilter: "blur(4px)",
          zIndex: 1050, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px"
        }}>
          <div className="card bg-white p-4 text-start shadow-lg animate-scale-up" style={{ maxWidth: "500px", width: "100%", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
            <h4 className="fw-bold text-dark mb-2">Reject Incident Resolution</h4>
            <p className="text-secondary mb-3" style={{ fontSize: "14px", lineHeight: "1.5" }}>
              Please provide a rejection reason for this incident resolution. This will notify the assigned analyst and return the status to <strong>UNDER INVESTIGATION</strong>.
            </p>
            <div className="mb-3">
              <label className="text-muted text-uppercase fw-semibold mb-1" style={{ fontSize: "10px", letterSpacing: "0.5px" }}>Rejection Reason (Mandatory)</label>
              <textarea 
                className="soc-form-control w-100 p-2.5" 
                rows="3" 
                required
                placeholder="Enter detailed reason for rejection..." 
                value={rejectionReason} 
                onChange={(e) => {
                  setRejectionReason(e.target.value);
                  if (e.target.value.trim()) setRejectionError("");
                }} 
                style={{ fontSize: "13.5px", borderRadius: "6px", border: rejectionError ? "1px solid #dc3545" : "1px solid #cbd5e1" }}
              />
              {rejectionError && (
                <div className="text-danger mt-1 fw-semibold" style={{ fontSize: "12px" }}>
                  {rejectionError}
                </div>
              )}
            </div>
            <div className="d-flex justify-content-end gap-2 mt-4">
              <button 
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectionError("");
                }} 
                className="btn btn-outline-secondary px-3 py-1.5 fw-semibold"
                style={{ fontSize: "13px" }}
              >
                Cancel
              </button>
              <button 
                onClick={submitReject} 
                className="btn btn-danger px-3 py-1.5 fw-semibold"
                style={{ fontSize: "13px" }}
              >
                Reject Resolution
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default IncidentDetails;
