import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, getMe, isGuest } from "../api";
import type { ListaDetail as Detail, LocalGroup, SearchResponse } from "../types";

// Lo que hace falta para proponer una canción: un item de Spotify o un
// grupo local, igual que al escribir una nota
interface Pick {
  itemType?: "album" | "track" | "artist";
  spotifyItemId?: string;
  musicItemId?: string;
  name: string;
  imageUrl: string | null;
}

export default function ListaDetail() {
  const { id } = useParams();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [localGroups, setLocalGroups] = useState<LocalGroup[]>([]);
  const [searching, setSearching] = useState(false);
  const [pick, setPick] = useState<Pick | null>(null);
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);

  // Copiar la estantería a una playlist de Spotify (no para invitados)
  const [canUseSpotify, setCanUseSpotify] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exported, setExported] = useState<{ url: string; added: number; skipped: number } | null>(null);
  const [exportError, setExportError] = useState("");

  useEffect(() => {
    getMe().then((me) => setCanUseSpotify(!isGuest(me.spotifyId))).catch(() => {});
  }, []);

  const exportToSpotify = async () => {
    setExporting(true);
    setExportError("");
    try {
      setExported(await api.post<{ url: string; added: number; skipped: number }>(`/api/listas/${id}/spotify`));
    } catch (e) {
      setExportError(e instanceof Error ? e.message : "No se pudo crear la playlist");
    } finally {
      setExporting(false);
    }
  };

  const load = () => {
    api
      .get<Detail>(`/api/listas/${id}`)
      .then(setDetail)
      .catch(() => setError("Esta estantería no existe o no se pudo cargar"));
  };

  useEffect(load, [id]);

  const toggleSave = async () => {
    if (!detail) return;
    if (detail.isSavedByMe) {
      await api.delete(`/api/listas/${id}/save`);
    } else {
      await api.post(`/api/listas/${id}/save`);
    }
    setDetail({ ...detail, isSavedByMe: !detail.isSavedByMe });
  };

  const share = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const search = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    try {
      const q = encodeURIComponent(query.trim());
      const [spotify, groups] = await Promise.all([
        api.get<SearchResponse>(`/api/search?q=${q}`),
        api.get<LocalGroup[]>(`/api/local-groups?query=${q}`),
      ]);
      setResults(spotify);
      setLocalGroups(groups);
    } catch {
      setError("No se pudo buscar");
    } finally {
      setSearching(false);
    }
  };

  const propose = async () => {
    if (!pick || !text.trim()) return;
    setSaving(true);
    setError("");
    try {
      await api.post(`/api/listas/${id}/items`, {
        itemType: pick.itemType,
        spotifyItemId: pick.spotifyItemId,
        musicItemId: pick.musicItemId,
        text,
      });
      setPick(null);
      setText("");
      setQuery("");
      setResults(null);
      setLocalGroups([]);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo añadir la canción");
    } finally {
      setSaving(false);
    }
  };

  const removeItem = async (itemId: string) => {
    await api.delete(`/api/listas/items/${itemId}`);
    load();
  };

  if (error) return <p className="error">{error}</p>;
  if (!detail) {
    return (
      <div className="loading-state">
        <span className="spinner" />
        Cargando…
      </div>
    );
  }

  const covers = detail.items.map((i) => i.musicItem.imageUrl).filter((u): u is string => !!u).slice(0, 6);

  return (
    <div className="app-col" style={{ maxWidth: 720 }}>
      <Link className="back-link" to="/listas">← Estanterías</Link>

      <div className="lista-hero">
        <div className="lista-hero-collage">
          {(covers.length > 0 ? covers : [null, null, null, null, null, null]).map((url, i) =>
            url ? (
              <div key={i} style={{ backgroundImage: `url(${url})` }} />
            ) : (
              <div key={i} style={{ background: "var(--surface-2)" }} />
            ),
          )}
        </div>
        <div className="lista-hero-body">
          <span className="card-kicker">Estantería</span>
          <h1 style={{ fontSize: "1.6rem", fontWeight: 600, letterSpacing: "-0.01em", lineHeight: 1.25 }}>
            {detail.title}
          </h1>
          <span className="lista-curator">
            <span className="note-avatar avatar-placeholder">
              {detail.curator.displayName[0]?.toUpperCase() ?? "♪"}
            </span>
            de {detail.curator.displayName}
          </span>
          {detail.mood && <p className="section-sub">{detail.mood}</p>}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              className={`btn btn-primary btn-sm btn-save${detail.isSavedByMe ? " is-saved" : ""}`}
              onClick={toggleSave}
            >
              {detail.isSavedByMe ? "✓ Guardada" : "Guardar estantería"}
            </button>
            <button className="btn btn-quiet btn-sm" onClick={share}>
              {copied ? "¡Copiado!" : "Compartir"}
            </button>
            {canUseSpotify &&
              (exported ? (
                <a className="btn btn-quiet btn-sm" href={exported.url} target="_blank" rel="noreferrer">
                  ✓ Abrir en Spotify
                </a>
              ) : (
                <button className="btn btn-quiet btn-sm" onClick={exportToSpotify} disabled={exporting}>
                  {exporting ? "Creando playlist…" : "Guardar en Spotify"}
                </button>
              ))}
          </div>
          {exported && (
            <p className="section-sub">
              Playlist creada en tu Spotify con {exported.added} {exported.added === 1 ? "canción" : "canciones"}
              {exported.skipped > 0 && ` (${exported.skipped} no entran en una playlist: discos o grupos locales)`}.
            </p>
          )}
          {exportError && <p className="error">{exportError}</p>}
        </div>
      </div>

      <div className="panel">
        {detail.items.length === 0 ? (
          <p className="empty-state" style={{ padding: 0 }}>Nadie ha propuesto una canción todavía.</p>
        ) : (
          detail.items.map((item, i) => (
            <div key={item.id} className="lista-song-row" style={i === 0 ? { borderTop: "none" } : undefined}>
              <Link to={`/musica/${item.musicItem.id}`} aria-label={item.musicItem.name}>
                {item.musicItem.imageUrl ? (
                  <img className="eco-cover" src={item.musicItem.imageUrl} alt="" />
                ) : (
                  <span className="eco-cover cover-placeholder">♪</span>
                )}
              </Link>
              <div style={{ flex: 1, minWidth: 0 }}>
                <Link
                  to={`/musica/${item.musicItem.id}`}
                  className="note-track-title lista-song-link"
                  style={{ color: "var(--text)", fontSize: "var(--fs-body)" }}
                >
                  {item.musicItem.name}
                  {item.musicItem.artistName && ` — ${item.musicItem.artistName}`}
                </Link>
                <div className="lista-song-note">«{item.text}» — {item.addedBy.displayName}</div>
              </div>
              {item.canRemove && (
                <button className="btn-link" onClick={() => removeItem(item.id)}>
                  Quitar
                </button>
              )}
            </div>
          ))
        )}
      </div>

      <div className="panel">
        <h3 className="section-title panel-title">¿Tienes una que encaje aquí?</h3>
        {error && <p className="error">{error}</p>}
        {!pick ? (
          <>
            <form onSubmit={search} className="field">
              <input
                type="text"
                placeholder="Busca una canción, álbum, artista o grupo local…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </form>
            {searching && <p className="section-sub">Buscando…</p>}
            {results && (
              <>
                {results.tracks.map((t) => (
                  <div key={t.id} className="result-row">
                    {t.imageUrl ? <img className="result-cover" src={t.imageUrl} alt="" /> : <span className="result-cover cover-placeholder">♪</span>}
                    <div className="result-name">{t.name}<small>{t.artistName}</small></div>
                    <button
                      className="btn btn-quiet btn-sm"
                      onClick={() => setPick({ itemType: "track", spotifyItemId: t.id, name: t.name, imageUrl: t.imageUrl })}
                    >
                      Proponer
                    </button>
                  </div>
                ))}
                {results.albums.map((a) => (
                  <div key={a.id} className="result-row">
                    {a.imageUrl ? <img className="result-cover" src={a.imageUrl} alt="" /> : <span className="result-cover cover-placeholder">♪</span>}
                    <div className="result-name">{a.name}<small>{a.artistName}</small></div>
                    <button
                      className="btn btn-quiet btn-sm"
                      onClick={() => setPick({ itemType: "album", spotifyItemId: a.id, name: a.name, imageUrl: a.imageUrl })}
                    >
                      Proponer
                    </button>
                  </div>
                ))}
                {localGroups.map((g) => (
                  <div key={g.id} className="result-row">
                    {g.imageUrl ? <img className="result-cover" src={g.imageUrl} alt="" /> : <span className="result-cover cover-placeholder">🎪</span>}
                    <div className="result-name">{g.name}<small>{g.description}</small></div>
                    <button
                      className="btn btn-quiet btn-sm"
                      onClick={() => setPick({ musicItemId: g.id, name: g.name, imageUrl: g.imageUrl })}
                    >
                      Proponer
                    </button>
                  </div>
                ))}
              </>
            )}
          </>
        ) : (
          <>
            <p className="section-sub">Proponiendo <strong style={{ color: "var(--text)" }}>{pick.name}</strong></p>
            <div className="field">
              <textarea
                placeholder="¿Por qué encaja aquí?"
                maxLength={300}
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button className="btn btn-quiet btn-sm" onClick={() => setPick(null)}>Cancelar</button>
              <button className="btn btn-primary btn-sm" onClick={propose} disabled={saving || !text.trim()}>
                {saving ? "Añadiendo…" : "Proponer una canción"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
