import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { App } from "./app/App";
import { AuthProvider } from "./auth/AuthProvider";
import "./styles.css";
import "./benefits.css";
import "./special-calculations.css";
import "./terminations.css";
import "./portal.css";
import "./communications.css";
import "./analytics.css";
import "./occupational-health.css";
import "./patrols.css";

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 30_000 } } });

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter><AuthProvider><App /></AuthProvider></BrowserRouter>
    </QueryClientProvider>
  </StrictMode>
);
