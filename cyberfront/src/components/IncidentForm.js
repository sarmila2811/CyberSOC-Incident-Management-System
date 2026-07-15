import React, { useState } from "react";

function IncidentForm({ addIncident }) {

  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState("Low");

  const handleSubmit = (e) => {
    e.preventDefault();

    const newIncident = {
      title,
      priority,
      status: "Open",
      analystNotes: ""
    };

    addIncident(newIncident);

    setTitle("");
    setPriority("Low");
  };

  return (
    <form onSubmit={handleSubmit}>
      
      <input
        type="text"
        placeholder="Incident Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
      />

      <select
        value={priority}
        onChange={(e) => setPriority(e.target.value)}
      >
        <option>Low</option>
        <option>Medium</option>
        <option>High</option>
        <option>Critical</option>
      </select>

      <button type="submit">Create Incident</button>

    </form>
  );
}

export default IncidentForm;