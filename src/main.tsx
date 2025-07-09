import React from "react";
import ReactDOM from "react-dom/client";
import RoutePlannerApp from "./RoutePlannerApp";
import "leaflet/dist/leaflet.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RoutePlannerApp />
  </React.StrictMode>
);
