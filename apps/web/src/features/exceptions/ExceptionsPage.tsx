import { CheckCircle2, Filter, Search, TriangleAlert } from "lucide-react";

export function ExceptionsPage() {
  return <div className="page">
    <section className="simple-heading"><div><span className="eyebrow"><TriangleAlert size={15} /> Central de exceções</span><h1>Decisões que precisam de pessoas</h1><p>O FluxRH continua executando o restante enquanto você cuida somente do que exige julgamento.</p></div><button className="primary-button"><CheckCircle2 size={17} /> Resolver em lote</button></section>
    <section className="panel empty-module">
      <div className="filter-bar"><div className="field"><Search size={17} /><span>Buscar exceções</span></div><button className="secondary-button"><Filter size={17} /> Filtros</button></div>
      <div className="module-placeholder"><span className="placeholder-icon"><TriangleAlert /></span><h2>Central preparada</h2><p>A listagem completa, filtros, atribuição e resolução de exceções serão a próxima funcionalidade deste módulo.</p></div>
    </section>
  </div>;
}
