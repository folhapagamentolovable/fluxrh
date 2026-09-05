import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { DashboardPage } from "@/features/dashboard/DashboardPage";

vi.mock("@/auth/AuthProvider", () => ({
  useAuth: () => ({
    user: {
      email: "neozinho@example.com",
      user_metadata: { full_name: "Neozinho" },
    },
  }),
}));
vi.mock("@/lib/api", () => ({
  getDashboard: async () => ({
    metrics: {
      activeEmployees: 35,
      openExceptions: 0,
      workflowsRunning: 0,
      automationRate: 100,
    },
    exceptions: [],
    workflows: [],
  }),
}));

describe("dashboard shortcuts", () => {
  it("targets the exact operational tabs and actions", async () => {
    render(
      <MemoryRouter>
        <QueryClientProvider
          client={
            new QueryClient({ defaultOptions: { queries: { retry: false } } })
          }
        >
          <DashboardPage />
        </QueryClientProvider>
      </MemoryRouter>,
    );
    expect(
      await screen.findByRole("link", { name: /Ocorrências de ponto/ }),
    ).toHaveAttribute("href", "/jornada?tab=exceptions");
    expect(
      screen.getByRole("link", { name: /Registrar afastamento/ }),
    ).toHaveAttribute(
      "href",
      "/ferias?tab=certificates&action=new-certificate",
    );
    expect(
      screen.getByRole("link", { name: /Fechar folhas de ponto/ }),
    ).toHaveAttribute("href", "/jornada?tab=closing");
    expect(
      screen.getByRole("link", { name: /Emitir holerites/ }),
    ).toHaveAttribute("href", "/folha?tab=history");
  });
});
