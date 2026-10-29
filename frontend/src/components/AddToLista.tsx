import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import type { ListaCard } from "../types";

// Qué se añade: una ficha que ya existe, o algo de Spotify recién buscado
export type ListaTarget =
  | { musicItemId: string }
  | { itemType: "track" | "album" | "artist"; spotifyItemId: string };

// "Añadir a una estantería" desde una ficha o desde el buscador de Notas:
// eliges una de tus estanterías y, si quieres, cuentas por qué encaja
export default function AddToLista({
  musicItemId,
  target,
  startOpen,
  onDone,
}: {
  musicItemId?: string;
  target?: ListaTarget;
  startOpen?: boolean;
  onDone?: () => void;
}) {
  const what: ListaTarget = target ?? { musicItemId: musicItemId! };
  const [open, setOpen] = useState(Boolean(startOpen));
  const [mine, setMine] = useState<ListaCard[] | null>(null);
  const [listaId, setListaId] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [added, setAdded] = useState<ListaCard | null>(null);

  useEffect(() => {
    if (startOpen) api.get<ListaCard[]>("/api/listas/mine").then(setMine).catch(() => setMine([]));
  }, [startOpen]);

  const toggle = () => {
    if (open && onDone) onDone();
    setOpen(!open);
    setAdded(null);
    if (!mine) api.get<ListaCard[]>("/api/listas/mine").then(setMine).catch(() => setMine([]));
  };

  const add = async () => {
    if (!listaId) return;
    setSaving(true);
    setError("");
    try {
      await api.post(`/api/listas/${listaId}/items`, { ...what, text });
      setAdded(mine?.find((l) => l.id === listaId) ?? null);
      setText("");
      setListaId(null);
      setOpen(false);
      onDone?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo añadir");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button className="btn btn-quiet btn-sm" onClick={toggle}>
        {open ? "Cancelar" : "Añadir a una estantería"}
      </button>
      {added && (
        <p className="section-sub" style={{ width: "100%" }}>
          ✓ Añadida a <Link to={`/listas/${added.id}`}>{added.title}</Link>
        </p>
      )}
      {open && (
        <div className="panel add-to-lista" style={{ width: "100%" }}>
          {mine === null && <p className="section-sub">Cargando tus estanterías…</p>}
          {mine?.length === 0 && (
            <p className="section-sub">
              Aún no tienes estanterías. <Link to="/listas">Crea una</Link> y vuelve.
            </p>
          )}
          {mine && mine.length > 0 && (
            <>
              <span className="section-sub">¿En cuál?</span>
              <div className="add-to-lista-options">
                {mine.map((l) => (
                  <button
                    key={l.id}
                    className={`tag-chip${listaId === l.id ? " is-selected" : ""}`}
                    onClick={() => setListaId(l.id)}
                  >
                    {l.title}
                  </button>
                ))}
              </div>
              <div className="field">
                <textarea
                  placeholder="¿Por qué encaja ahí? (opcional)"
                  maxLength={300}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                />
              </div>
              {error && <p className="error">{error}</p>}
              <button
                className="btn btn-primary btn-sm"
                style={{ alignSelf: "flex-end" }}
                onClick={add}
                disabled={saving || !listaId}
              >
                {saving ? "Añadiendo…" : "Añadir"}
              </button>
            </>
          )}
        </div>
      )}
    </>
  );
}
