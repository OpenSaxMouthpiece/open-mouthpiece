import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";
import "./appearance"; // applies the light/dark theme before the first paint
import { reportUnfinishedRender, watchPageErrors } from "./report";

watchPageErrors();
reportUnfinishedRender(); // the last visit froze during a render

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
