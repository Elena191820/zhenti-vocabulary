import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import WordVault from "../app/WordVault";
import "../app/globals.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <WordVault />
  </StrictMode>,
);
