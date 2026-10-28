import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import type { ListaCard } from "../types";
import CreateListaPanel from "../components/CreateListaPanel";

export default function Listas() {
  const [listas, setListas] = useState<ListaCard[] | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const load = () => {
    api.get<ListaCard[]>("/api/listas").then(setListas);
  };

  useEffect(load, []);

  if (!listas) {
    return (
      <div className="loading-state">
        <span className="spinner" />
        Cargando…
      </div>
    );
  }

  return (
    <>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, paddingTop: 8, flexWrap: "wrap" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, maxWidth: 520 }}>
          <h2 className="section-title">Estanterías</h2>
          <p className="section-sub">
            Colecciones hechas a mano por tu gente. Sin algoritmo, sin autoplay: cada
            canción llega con el porqué de quien la puso.
          </p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => setShowCreate(!showCreate)}>
          ＋ Crear estantería
        </button>
      </div>

      {showCreate && <CreateListaPanel />}

      {listas.length === 0 ? (
        <p className="empty-state">Nadie ha creado una estantería todavía. Sé la primera persona.</p>
      ) : (
        <div className="listas-grid" style={{ marginTop: 20 }}>
          {listas.map((lista) => (
            <Link key={lista.id} to={`/listas/${lista.id}`} className="lista-card">
              <div className="lista-collage">
                {(lista.coverImages.length > 0 ? lista.coverImages : [null, null, null, null])
                  .slice(0, 4)
                  .map((url, i) =>
                    url ? (
                      <div key={i} style={{ backgroundImage: `url(${url})` }} />
                    ) : (
                      <div key={i} style={{ background: "var(--surface-2)" }} />
                    ),
                  )}
              </div>
              <div className="lista-body">
                <span className="lista-title">{lista.title}</span>
                <span className="lista-curator">
                  <span className="note-avatar avatar-placeholder">
                    {lista.curator.displayName[0]?.toUpperCase() ?? "♪"}
                  </span>
                  de {lista.curator.displayName}
                </span>
                {lista.mood && <span className="lista-mood">{lista.mood}</span>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
