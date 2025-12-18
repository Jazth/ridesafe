import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";

import "./index.css";
import Dashboard from "./pages/Dashboard.tsx";
import Mechanics from "./pages/mechanics.tsx";
import Reports from "./pages/reports.tsx"; // <-- Capitalize
import Users from "./pages/users";
import Privacy from "./pages/privacy.tsx"
import DeleteAccount from "./pages/delete-account.tsx"
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/users" element={<Users />} /> 
        <Route path="/mechanics" element={<Mechanics />} />   
        <Route path="/reports" element={<Reports />} /> 
        <Route path="/privacy" element={<Privacy />} /> 
        <Route path="/delete-account" element={<DeleteAccount />} /> 
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
