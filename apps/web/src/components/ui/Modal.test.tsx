import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { describe, expect, it, vi } from "vitest";
import { Modal } from "./Modal";

describe("Modal", () => {
  it("expõe nome e descrição acessíveis sem violações Axe", async () => {
    const { container } = render(<Modal open title="Confirmar ação" description="Revise antes de continuar." onClose={() => undefined}><button>Confirmar</button></Modal>);

    expect(screen.getByRole("dialog", { name: "Confirmar ação", description: "Revise antes de continuar." })).toBeVisible();
    expect((await axe.run(container)).violations).toEqual([]);
  });

  it("fecha com Escape e devolve o foco ao acionador", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const trigger = document.createElement("button");
    document.body.append(trigger);
    trigger.focus();
    const view = render(<Modal open title="Editar perfil" onClose={onClose}><button>Salvar</button></Modal>);

    expect(screen.getByRole("button", { name: "Fechar Editar perfil" })).toHaveFocus();
    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledOnce();
    view.unmount();
    expect(trigger).toHaveFocus();
    trigger.remove();
  });

  it("mantém a navegação por Tab dentro do diálogo", async () => {
    const user = userEvent.setup();
    render(<Modal open title="Editar perfil" onClose={() => undefined}><button>Salvar</button></Modal>);
    const close = screen.getByRole("button", { name: "Fechar Editar perfil" });
    const save = screen.getByRole("button", { name: "Salvar" });

    expect(close).toHaveFocus();
    await user.tab({ shift: true });
    expect(save).toHaveFocus();
    await user.tab();
    expect(close).toHaveFocus();
  });
});
