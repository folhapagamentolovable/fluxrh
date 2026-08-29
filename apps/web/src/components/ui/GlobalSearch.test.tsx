import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { GlobalSearch } from "./GlobalSearch";

vi.mock("@/lib/api", () => ({
  getAdmissions: async () => [],
  getEmployees: async () => [
    {
      id: "f1000000-0000-4000-8000-000000000001",
      registration: "AUD-0001",
      fullName: "Samuel Ferreira de Almeida — Fictício",
      position: "Vigia",
      departmentName: "Operações",
    },
  ],
}));

function CurrentPath() {
  return <output aria-label="Rota atual">{useLocation().pathname}</output>;
}

describe("GlobalSearch", () => {
  it("opens the selected employee by its identifier instead of using the search term as a route", async () => {
    const user = userEvent.setup();
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <GlobalSearch open onClose={() => undefined} />
          <CurrentPath />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await user.type(screen.getByRole("textbox", { name: "Campo de busca" }), "Samuel");
    await user.click(
      await screen.findByRole("option", {
        name: /Samuel Ferreira de Almeida — Fictício/i,
      }),
    );

    expect(screen.getByRole("status", { name: "Rota atual" })).toHaveTextContent(
      "/pessoas/f1000000-0000-4000-8000-000000000001",
    );
  });
});
