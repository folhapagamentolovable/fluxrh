import type { LucideIcon } from "lucide-react";

export function ModulePlaceholder({
  title,
  description,
  icon: Icon,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
}) {
  return (
    <div className="page">
      <section className="simple-heading">
        <div>
          <span className="eyebrow">Módulo FluxRH</span>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
      </section>
      <section className="panel module-placeholder">
        <span className="placeholder-icon">
          <Icon />
        </span>
        <h2>Fundação pronta</h2>
        <p>
          Este módulo já está conectado à navegação e receberá seu domínio na
          próxima etapa do roadmap.
        </p>
        <button
          className="primary-button"
          onClick={() => {
            window.location.href = "/automacoes";
          }}
        >
          Abrir automações
        </button>
      </section>
    </div>
  );
}
