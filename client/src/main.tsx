import { createRoot } from "react-dom/client";
import App from "./App";
import { LoanProvider } from "./contexts/LoanContext";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <LoanProvider>
    <App />
  </LoanProvider>
);
