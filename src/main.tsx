import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";
import "./appearance"; // applies the light/dark theme before the first paint
import { reportUnfinishedRender, watchPageErrors } from "./report";

// The dev site (dev.<domain>, the `dev` branch): marked as such, and kept out of search engines.
if (location.hostname.startsWith("dev.")) {
  document.documentElement.classList.add("site-dev");
  document.title = `[dev] ${document.title}`;
  const robots = document.createElement("meta");
  robots.name = "robots";
  robots.content = "noindex, nofollow";
  document.head.appendChild(robots);
}

watchPageErrors();
reportUnfinishedRender(); // the last visit froze during a render

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
