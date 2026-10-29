import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import type { ListaCard } from "../types";
import CreateListaPanel from "../components/CreateListaPanel";
import { useNavigate } from "react-router-dom";
import type { RutaCard, RutaRequestItem } from "../types";
import { AuthorAvatar, PdeHero, RutaCardSmall } from "../components/RutaCards";

export default function Listas() {
  const [listas, setListas] = useState<ListaCard[] | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const load = () => {
    api.get<ListaCard[]>("/api/listas").then(setListas);
  };

  useEffect(load, []);

  // «Por dónde empezar»: ruta destacada, peticiones abiertas y más rutas
  const navigate = useNavigate();
  const [featured, setFeatured] = useState<RutaCard | null>(null);
  const [rutas, setRutas] = useState<RutaCard[]>([]);
  const [requests, setRequests] = useState<RutaRequestItem[]>([]);
  const [ask, setAsk] = useState("");
  const loadRequests = () => api.get<RutaRequestItem[]>("/api/rutas/requests").then(setRequests).catch(() => {});
  useEffect(() => {
    api.get<RutaCard | undefined>("/api/rutas/side").then((c) => setFeatured(c ?? null)).catch(() => {});
    api.get<RutaCard[]>("/api/rutas").then(setRutas).catch(() => {});
    loadRequests();
  }, []);
  const sendAsk = async () => {
    if (!ask.trim()) return;
    await api.post("/api/rutas/requests", { artistName: ask.trim() }).catch(() => {});
    setAsk("");
    loadRequests();
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
          <h2 className="section-title">Listas y «Por dónde empezar»</h2>
          <p className="section-sub">
            Colecciones hechas a mano por tu gente. Sin algoritmo, sin autoplay: cada
            canción llega con el porqué de quien la puso.
          </p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => setShowCreate(!showCreate)}>
          ＋ Crear estantería
        </button>
      </div>

      <section className="pde">
        <div className="ruta-entry-head">
          <div>
            <span className="ruta-kicker">POR DÓNDE EMPEZAR</span>
            <h3 className="pde-title">Empieza a escuchar a alguien de la mano de quien ya lo conoce</h3>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => navigate("/rutas/nueva")}>
            ＋ Crear ruta
          </button>
        </div>
        {featured && <PdeHero card={featured} />}
        <div className="pde-ask">
          <div className="pde-ask-row">
            <span className="pde-ask-icon">?</span>
            <input
              type="text"
              placeholder="¿Con quién quieres empezar? Pídeselo a tu gente…"
              aria-label="Pedir una ruta"
              value={ask}
              onChange={(e) => setAsk(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendAsk()}
            />
            <button className="btn btn-quiet btn-sm" onClick={sendAsk} disabled={!ask.trim()}>
              Pedir
            </button>
          </div>
          {requests.length > 0 && (
            <div className="pde-asks">
              {requests.map((r) => (
                <div key={r.id} className="pde-req">
                  <AuthorAvatar name={r.from.displayName} url={r.from.avatarUrl} />
                  <span>
                    <strong>{r.isMine ? "Tú" : r.from.displayName.split(" ")[0]}</strong>{" "}
                    {r.isMine ? "preguntas" : "pregunta"} por dónde empezar con <strong>{r.artistName}</strong>
                  </span>
                  {!r.isMine && (
                    <button
                      className="btn btn-quiet btn-sm"
                      onClick={() =>
                        navigate(`/rutas/nueva?artista=${encodeURIComponent(r.artistName)}&peticion=${r.id}`)
                      }
                    >
                      Responder con una ruta
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        {rutas.filter((r) => r.id !== featured?.id).length > 0 && (
          <div className="ruta-entry-row">
            {rutas
              .filter((r) => r.id !== featured?.id)
              .map((r) => (
                <RutaCardSmall key={r.id} card={r} />
              ))}
          </div>
        )}
      </section>

      <div className="ruta-entry-head" style={{ marginTop: 36 }}>
        <div>
          <span className="ruta-kicker">ESTANTERÍAS</span>
          <h3 className="section-title" style={{ fontSize: "1.15rem" }}>Para un momento concreto</h3>
        </div>
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
