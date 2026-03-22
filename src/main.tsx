import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { installGlobalErrorGuards } from "./lib/installGlobalErrorGuards";
import "./index.css";

installGlobalErrorGuards();

createRoot(document.getElementById("root")!).render(<App />);
