import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import VideoTemplate from "@/components/video/VideoTemplate";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode><VideoTemplate /></StrictMode>,
);