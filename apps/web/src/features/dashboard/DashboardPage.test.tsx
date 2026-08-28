import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { DashboardPage } from "./DashboardPage";

vi.mock("@/auth/AuthProvider", () => ({
  useAuth: () => ({ user: { email: "neozinho@example.com", user_metadata: { full_name: "Neozinho" } } }),
}));
vi.mock("@/lib/api", () => ({
  getDashboard: async () => ({
    organization: { id: "org", name: "Officecamp", document: "test" },
    metrics: { activeEmployees: 88, openExceptions: 0, workflowsRunning: 0, automationRate: 91.4 },
    exceptions: [], workflows: [],
  }),
}));

describe("DashboardPage", () => {
  it("uses the authenticated user's name and remote employee metric", async () => {
    render(<QueryClientProvider client={new QueryClient()}><MemoryRouter><DashboardPage /></MemoryRouter></QueryClientProvider>);
    expect(await screen.findByRole("heading", { name: "Bom dia, Neozinho." })).toBeVisible();
    expect(screen.getByText("88")).toBeVisible();
  });
});
