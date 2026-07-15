import React from "react";
import { useNavigate } from "react-router-dom";

function DashboardCard({
  title,
  count,
  icon,
  route
}) {
  const navigate = useNavigate();

  return (
    <div
      className="dashboard-card"
      onClick={() => navigate(route)}
    >
      <div className="card-top">
        <span>{icon}</span>
      </div>

      <h3>{title}</h3>

      <h1>{count}</h1>
    </div>
  );
}

export default DashboardCard;