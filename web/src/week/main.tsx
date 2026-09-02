import React from "react";
import { createRoot } from "react-dom/client";
import { WeekView } from "./WeekView.js";

createRoot(document.getElementById("lopning-livet-root")!).render(
  <React.StrictMode>
    <WeekView />
  </React.StrictMode>,
);
