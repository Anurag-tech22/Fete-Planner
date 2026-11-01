/// <reference types="vite/client" />
import "./zod-config"; // must stay first: configures Zod before any schema exists
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  });
}
createRoot(document.getElementById("root") as HTMLElement).render(<App />);
