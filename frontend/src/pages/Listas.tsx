import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import type { ListaCard } from "../types";

export default function Listas() {
  const [listas, setListas] = useState<ListaCard[] | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [mood, setMood] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = () => {
    api.get<ListaCard[]>("/api/listas").then(setListas);
  };

  useEffect(load, []);

  const create = async () => {
    if (!title.trim()) return;
    setSaving(true);
    setError("");
    try {
      await api.post("/api/listas", { title, mood: mood || null });
      setTitle("");
      setMood("");
      setShowCreate(false);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo crear la estantería");
    } finally {
      setSaving(false);
    }
  };

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

      {showCreate && (
        <div className="panel" style={{ marginTop: 12 }}>
          {error && <p className="error">{error}</p>}
          <div className="field">
            <label>Título</label>
            <input
              type="text"
              placeholder="Ej. Para volver a casa en bici de noche"
              maxLength={120}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="field">
            <label>Ambiente (opcional)</label>
            <input
              type="text"
              placeholder="Para qué momento sirve esta estantería"
              maxLength={200}
              value={mood}
              onChange={(e) => setMood(e.target.value)}
            />
          </div>
          <button className="btn btn-primary btn-sm" style={{ alignSelf: "flex-end" }} onClick={create} disabled={saving || !title.trim()}>
            {saving ? "Creando…" : "Crear estantería"}
          </button>
        </div>
      )}

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
