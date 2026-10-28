import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import type { ListaDetail, SearchItem, SearchResponse } from "../types";

// Una canción o disco elegido antes de crear la estantería
interface Picked {
  itemType: "track" | "album";
  spotifyItemId: string;
  name: string;
  artistName: string;
  imageUrl: string | null;
}

type Mode = "manual" | "spotify";

// Crear una estantería: desde cero (con canciones sueltas ya elegidas) o
// importando una playlist de Spotify pegando su enlace
export default function CreateListaPanel() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("manual");
  const [title, setTitle] = useState("");
  const [mood, setMood] = useState("");
  const [playlistUrl, setPlaylistUrl] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [searching, setSearching] = useState(false);
  const [picked, setPicked] = useState<Picked[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const search = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    try {
      setResults(await api.get<SearchResponse>(`/api/search?q=${encodeURIComponent(query.trim())}`));
    } catch {
      setError("No se pudo buscar");
    } finally {
      setSearching(false);
    }
  };

  const isPicked = (id: string) => picked.some((p) => p.spotifyItemId === id);
  const toggle = (itemType: Picked["itemType"], r: SearchItem) =>
    setPicked(
      isPicked(r.id)
        ? picked.filter((p) => p.spotifyItemId !== r.id)
        : [...picked, { itemType, spotifyItemId: r.id, name: r.name, artistName: r.artistName, imageUrl: r.imageUrl }],
    );

  const create = async () => {
    setSaving(true);
    setError("");
    try {
      const lista =
        mode === "spotify"
          ? await api.post<ListaDetail>("/api/listas/import", {
              playlistUrl,
              title: title || null,
              mood: mood || null,
            })
          : await api.post<ListaDetail>("/api/listas", {
              title,
              mood: mood || null,
              items: picked.map((p) => ({ itemType: p.itemType, spotifyItemId: p.spotifyItemId })),
            });
      navigate(`/listas/${lista.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo crear la estantería");
      setSaving(false);
    }
  };

  const resultRow = (itemType: Picked["itemType"], r: SearchItem) => (
    <div key={r.id} className="result-row">
      {r.imageUrl ? <img className="result-cover" src={r.imageUrl} alt="" /> : <span className="result-cover cover-placeholder">♪</span>}
      <div className="result-name">
        {r.name}
        <small>{itemType === "album" ? `disco · ${r.artistName}` : r.artistName}</small>
      </div>
      <button className={`btn btn-sm ${isPicked(r.id) ? "btn-ghost is-saved" : "btn-quiet"}`} onClick={() => toggle(itemType, r)}>
        {isPicked(r.id) ? "✓ Añadida" : "Añadir"}
      </button>
    </div>
  );

  const canCreate = mode === "spotify" ? playlistUrl.trim().length > 0 : title.trim().length > 0;

  return (
    <div className="panel" style={{ marginTop: 12 }}>
      <div className="tab-bar" role="tablist">
        <button className={`tab-btn${mode === "manual" ? " is-active" : ""}`} role="tab" aria-selected={mode === "manual"} onClick={() => setMode("manual")}>
          Desde cero
        </button>
        <button className={`tab-btn${mode === "spotify" ? " is-active" : ""}`} role="tab" aria-selected={mode === "spotify"} onClick={() => setMode("spotify")}>
          Importar de Spotify
        </button>
      </div>

      {mode === "spotify" && (
        <div className="field">
          <label>Enlace de la playlist</label>
          <input
            type="url"
            placeholder="https://open.spotify.com/playlist/…"
            value={playlistUrl}
            onChange={(e) => setPlaylistUrl(e.target.value)}
          />
          <p className="section-sub">
            En Spotify: ··· en la playlist → Compartir → Copiar enlace. Se traen hasta 100 canciones.
          </p>
        </div>
      )}

      <div className="field">
        <label>{mode === "spotify" ? "Título (opcional, por defecto el de la playlist)" : "Título"}</label>
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

      {mode === "manual" && (
        <>
          <div className="field">
            <label>Canciones (opcional, puedes añadir más luego)</label>
            <form onSubmit={search}>
              <input
                type="text"
                placeholder="Busca una canción o un disco y pulsa Enter"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </form>
          </div>
          {searching && <p className="section-sub">Buscando…</p>}
          {results && (
            <div>
              {results.tracks.slice(0, 6).map((t) => resultRow("track", t))}
              {results.albums.slice(0, 3).map((a) => resultRow("album", a))}
            </div>
          )}
          {picked.length > 0 && (
            <div className="add-to-lista">
              <span className="section-sub">
                {picked.length} {picked.length === 1 ? "elegida" : "elegidas"}:
              </span>
              <div className="add-to-lista-options">
                {picked.map((p) => (
                  <button
                    key={p.spotifyItemId}
                    className="tag-chip is-selected"
                    title="Quitar"
                    onClick={() => setPicked(picked.filter((x) => x.spotifyItemId !== p.spotifyItemId))}
                  >
                    {p.name} ✕
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {error && <p className="error">{error}</p>}
      <button className="btn btn-primary btn-sm" style={{ alignSelf: "flex-end" }} onClick={create} disabled={saving || !canCreate}>
        {saving ? (mode === "spotify" ? "Importando…" : "Creando…") : mode === "spotify" ? "Importar playlist" : "Crear estantería"}
      </button>
    </div>
  );
}
