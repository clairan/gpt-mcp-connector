import React from "react";
import { createRoot } from "react-dom/client";
import { TrainingLogView } from "./TrainingLogView.js";

createRoot(document.getElementById("lopning-livet-root")!).render(
  <React.StrictMode>
    <TrainingLogView />
  </React.StrictMode>,
);
