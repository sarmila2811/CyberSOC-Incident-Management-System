import React, { useState } from "react";

function IncidentTable({
  incidents,
  deleteIncident,
  updateStatus,
  assignIncident
}) {

  // store selected analyst per row
  const [selectedAnalyst, setSelectedAnalyst] = useState({});

  const handleAssign = (id) => {
    const assignedTo = selectedAnalyst[id];

    if (!assignedTo) {
      alert("Please select analyst");
      return;
    }

    assignIncident(id, assignedTo);
  };

  return (
    <table border="1" width="100%">

      <thead>
        <tr>
          <th>ID</th>
          <th>Title</th>
          <th>Priority</th>
          <th>Status</th>
          <th>Assigned To</th>
          <th>Actions</th>
        </tr>
      </thead>

      <tbody>
        {incidents.map((item) => (
          <tr key={item.id}>

            <td>{item.id}</td>
            <td>{item.title}</td>
            <td>{item.priority}</td>
            <td>{item.status}</td>

            {/* NEW COLUMN */}
            <td>
              {item.assignedTo || "Not Assigned"}
            </td>

            <td>

              {/* STATUS BUTTONS */}
              <button onClick={() => updateStatus(item.id, "Under Investigation")}>
                Investigate
              </button>

              <button onClick={() => updateStatus(item.id, "Pending Approval")}>
                Submit
              </button>

              <button onClick={() => updateStatus(item.id, "Resolved")}>
                Resolve
              </button>

              <br /><br />

              {/* ASSIGN DROPDOWN */}
              <select
                value={selectedAnalyst[item.id] || ""}
                onChange={(e) =>
                  setSelectedAnalyst({
                    ...selectedAnalyst,
                    [item.id]: e.target.value
                  })
                }
              >
                <option value="">Select Analyst</option>
                <option value="analyst1">analyst1</option>
                <option value="analyst2">analyst2</option>
                <option value="analyst3">analyst3</option>
              </select>

              <button onClick={() => handleAssign(item.id)}>
                Assign
              </button>

              <br /><br />

              {/* DELETE */}
              <button onClick={() => deleteIncident(item.id)}>
                Delete
              </button>

            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default IncidentTable;