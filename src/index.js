// src/index.js
import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";

// ❗ ต้องใส่ .js ให้ครบ เพราะ package.json มี "type": "module"
import App from "./App.js";

const root = ReactDOM.createRoot(document.getElementById("root"));

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
