import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { DocumentDetailPage } from "./DocumentDetailPage";

vi.mock("@/lib/api", () => ({
  getDocument: vi.fn(async () => ({
    id: "doc_1", title: "Contrato de trabalho", category: "contract", version: 1, status: "sent",
    subjectName: "Joana Silva", subjectDocument: "***.000.***-00", companyName: "Grupo Flux",
    templateName: "Contrato CLT", createdAt: "2026-08-20T12:00:00.000Z",
    preview: { heading: "Contrato", subheading: "Termos", paragraphs: ["Conteúdo do contrato."], clauses: [] },
    auditTrail: [],
  })),
  acceptDocument: vi.fn(), validateDocument: vi.fn(),
}));

describe("DocumentDetailPage", () => {
  it("aciona a impressão nativa do documento", async () => {
    const print = vi.spyOn(window, "print").mockImplementation(() => undefined);
    render(<QueryClientProvider client={new QueryClient()}><MemoryRouter initialEntries={["/documentos/doc_1"]}><Routes><Route path="/documentos/:id" element={<DocumentDetailPage/>}/></Routes></MemoryRouter></QueryClientProvider>);
    await userEvent.click(await screen.findByRole("button", { name: "Imprimir" }));
    expect(print).toHaveBeenCalledOnce();
    print.mockRestore();
  });
});
