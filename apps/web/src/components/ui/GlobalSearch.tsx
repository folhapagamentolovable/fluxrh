import { useQuery } from "@tanstack/react-query";
import { Building2, FileText, Search, UserPlus, UsersRound, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAdmissions, getEmployees } from "@/lib/api";
import { navigation } from "@/app/navigation";

interface SearchResult {
  id: string;
  label: string;
  sublabel?: string;
  path: string;
  icon: React.ReactNode;
  group: string;
}

interface GlobalSearchProps {
  open: boolean;
  onClose: () => void;
}

export function GlobalSearch({ open, onClose }: GlobalSearchProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const [cursor, setCursor] = useState(0);

  const { data: employees = [] } = useQuery({ queryKey: ["employees"], queryFn: getEmployees, enabled: open });
  const { data: admissions = [] } = useQuery({ queryKey: ["admissions"], queryFn: getAdmissions, enabled: open });

  useEffect(() => {
    if (open) {
      setQuery("");
      setCursor(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const results = useMemo<SearchResult[]>(() => {
    const q = query.toLowerCase().trim();
    if (!q) return [];

    const items: SearchResult[] = [];

    // Colaboradores
    for (const emp of employees) {
      if (`${emp.fullName} ${emp.position} ${emp.registration}`.toLowerCase().includes(q)) {
        items.push({
          id: `emp-${emp.id}`,
          label: emp.fullName,
          sublabel: `${emp.position} · ${emp.departmentName}`,
          path: `/pessoas/${emp.id}`,
          icon: <UsersRound size={15} />,
          group: "Colaboradores",
        });
      }
    }

    // Admissões
    for (const adm of admissions) {
      if (`${adm.candidateName} ${adm.position} ${adm.companyName}`.toLowerCase().includes(q)) {
        items.push({
          id: `adm-${adm.id}`,
          label: adm.candidateName,
          sublabel: `${adm.position} · ${adm.companyName}`,
          path: `/admissoes/${adm.id}`,
          icon: <UserPlus size={15} />,
          group: "Admissões",
        });
      }
    }

    // Páginas de navegação
    for (const nav of navigation) {
      if (nav.label.toLowerCase().includes(q)) {
        items.push({
          id: `nav-${nav.path}`,
          label: nav.label,
          sublabel: "Ir para a página",
          path: nav.path,
          icon: <nav.icon size={15} />,
          group: "Páginas",
        });
      }
    }

    return items.slice(0, 12);
  }, [query, employees, admissions]);

  // Agrupados para exibição
  const groups = useMemo(() => {
    const map = new Map<string, SearchResult[]>();
    for (const item of results) {
      const list = map.get(item.group) ?? [];
      list.push(item);
      map.set(item.group, list);
    }
    return map;
  }, [results]);

  // Flatlist para navegação via teclado
  const flat = results;

  function go(path: string) {
    navigate(path);
    onClose();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor(c => Math.min(c + 1, flat.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor(c => Math.max(c - 1, 0));
    } else if (e.key === "Enter" && flat[cursor]) {
      go(flat[cursor].path);
    } else if (e.key === "Escape") {
      onClose();
    }
  }

  if (!open) return null;

  return (
    <div className="global-search-overlay" role="dialog" aria-modal="true" aria-label="Busca global" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="global-search-panel">
        <div className="global-search-field">
          <Search size={18} aria-hidden="true" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => { setQuery(e.target.value); setCursor(0); }}
            onKeyDown={handleKeyDown}
            placeholder="Buscar pessoas, admissões, páginas…"
            aria-label="Campo de busca"
            autoComplete="off"
            spellCheck={false}
          />
          {query && (
            <button className="global-search-clear" onClick={() => setQuery("")} aria-label="Limpar busca">
              <X size={16} />
            </button>
          )}
        </div>

        {query && (
          <div className="global-search-results" role="listbox">
            {results.length === 0 ? (
              <div className="global-search-empty">Nenhum resultado para "<strong>{query}</strong>"</div>
            ) : (
              Array.from(groups.entries()).map(([group, items]) => (
                <div key={group} className="global-search-group">
                  <div className="global-search-group-label">{group}</div>
                  {items.map(item => {
                    const index = flat.indexOf(item);
                    return (
                      <button
                        key={item.id}
                        role="option"
                        aria-selected={index === cursor}
                        className={`global-search-item ${index === cursor ? "active" : ""}`}
                        onClick={() => go(item.path)}
                        onMouseEnter={() => setCursor(index)}
                      >
                        <span className="global-search-item-icon">{item.icon}</span>
                        <span>
                          <strong>{item.label}</strong>
                          {item.sublabel && <small>{item.sublabel}</small>}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        )}

        {!query && (
          <div className="global-search-hint">
            <span>↑↓ navegar</span>
            <span>↵ abrir</span>
            <span>Esc fechar</span>
          </div>
        )}
      </div>
    </div>
  );
}
