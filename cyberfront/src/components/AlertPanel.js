import React, { useEffect, useState } from "react";

function AlertPanel() {
  const [alerts, setAlerts] = useState([]);

  const norm = (v) => (v || "").toLowerCase().trim();

  useEffect(() => {
    fetch(window.API_BASE_URL + "/api/incidents")
      .then((res) => res.json())
      .then((data) => {
        const filtered = data.filter(
          (inc) =>
            norm(inc.priority) === "critical" ||
            norm(inc.priority) === "high" ||
            norm(inc.status) === "under investigation"
        );

        setAlerts(filtered);
      })
      .catch((err) => console.log(err));
  }, []);

  return (
    <div className="alert-panel">
      <h2>Live Security Alerts</h2>

      {alerts.length === 0 ? (
        <div className="alert-item">✅ No Active Alerts</div>
      ) : (
        alerts.map((a) => (
          <div key={a.id} className="alert-item">
            🚨 {a.title} - {a.priority} - {a.status}
          </div>
        ))
      )}
    </div>
  );
}

export default AlertPanel;