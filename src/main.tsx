import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initAnalytics } from "./lib/analytics";
import { initReloadGuard } from "./lib/reloadGuard";
import { initChunkErrorHandler } from "./lib/chunkErrorHandler";

initReloadGuard();
initChunkErrorHandler();
initAnalytics();

createRoot(document.getElementById("root")!).render(<App />);
