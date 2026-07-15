import React from "react";
import ReactDOM from "react-dom/client";

import "./index.css";
import App from "./App";

window.API_BASE_URL = (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_API_URL)
  || process.env.REACT_APP_API_URL
  || "http://localhost:8080";

const root =
  ReactDOM.createRoot(
    document.getElementById("root")
  );

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);