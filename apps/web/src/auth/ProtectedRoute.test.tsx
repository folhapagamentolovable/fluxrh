import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { ProtectedRoute } from "./ProtectedRoute";

const auth = vi.hoisted(() => ({ loading: false, user: null as null | { user_metadata: Record<string, unknown> } }));
vi.mock("./AuthProvider", () => ({ useAuth: () => auth }));

describe("ProtectedRoute", () => {
  it("redireciona o primeiro acesso para alteração de senha", () => {
    auth.user = { user_metadata: { must_change_password: true } };
    render(<MemoryRouter initialEntries={["/"]}><Routes>
      <Route element={<ProtectedRoute />}><Route index element={<div>Painel</div>} /><Route path="alterar-senha" element={<div>Trocar senha</div>} /></Route>
    </Routes></MemoryRouter>);
    expect(screen.getByText("Trocar senha")).toBeVisible();
    expect(screen.queryByText("Painel")).not.toBeInTheDocument();
  });
});
