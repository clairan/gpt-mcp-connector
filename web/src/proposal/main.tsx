import React from "react";
import { createRoot } from "react-dom/client";
import { ProposalCard } from "./ProposalCard.js";

createRoot(document.getElementById("lopning-livet-root")!).render(
  <React.StrictMode>
    <ProposalCard />
  </React.StrictMode>,
);
