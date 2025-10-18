import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";

import "./index.css";
import Dashboard from "./pages/Dashboard.tsx";
import Mechanics from "./pages/mechanics.tsx";
import Reports from "./pages/reports.tsx"; // <-- Capitalize
import Users from "./pages/users";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/users" element={<Users />} /> 
        <Route path="/mechanics" element={<Mechanics />} />   
        <Route path="/reports" element={<Reports />} /> 
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
