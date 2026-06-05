import { StrictMode, lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

const Admin = lazy(() => import("./pages/Admin"));

const isAdmin = window.location.pathname.startsWith("/admin");

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {isAdmin ? (
      <Suspense
        fallback={
          <div className="mesh-bg min-h-dvh flex items-center justify-center text-muted font-ui">
            載入中…
          </div>
        }
      >
        <Admin />
      </Suspense>
    ) : (
      <App />
    )}
  </StrictMode>
);
