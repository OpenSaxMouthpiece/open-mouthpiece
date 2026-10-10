import "./fresh"; // must run before anything reads storage
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";
import "./appearance"; // applies the light/dark theme before the first paint
import { reportUnfinishedRender, watchPageErrors } from "./report";

declare const __BUILD__: string;
declare const __BUILD_TIME__: string;

// The dev site (dev.<domain>, the `dev` branch): marked as such, with the commit it was built from
// (so it's clear whether the latest is up), and kept out of search engines.
if (location.hostname.startsWith("dev.") || location.search.includes("devtag")) {
  document.documentElement.classList.add("site-dev");
  const when = new Date(__BUILD_TIME__).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  document.documentElement.style.setProperty("--build", JSON.stringify(`dev · ${when} · ${__BUILD__}`));
  document.title = `[dev] ${document.title}`;
  const robots = document.createElement("meta");
  robots.name = "robots";
  robots.content = "noindex, nofollow";
  document.head.appendChild(robots);
}

watchPageErrors();
reportUnfinishedRender(); // the last visit froze during a render

// The 3D view needs WebGL: without it (switched off, a headless browser) the app can't work, so the
// page says so instead of starting.
const canvas = document.createElement("canvas");
const hasWebGL = !!(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));

createRoot(document.getElementById("root")!).render(
  hasWebGL ? (
    <StrictMode>
      <App />
    </StrictMode>
  ) : (
    <p className="no-webgl">
      Open Mouthpiece needs WebGL to show the 3D model, and this browser doesn't have it (it may be switched off). Try
      another browser or turn on hardware acceleration.
    </p>
  ),
);
