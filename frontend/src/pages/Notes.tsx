import { useEffect, useState } from "react";
import { api } from "../api";
import type { LocalGroup, LocalGroupOptions, Note, SearchArtist, SearchResponse } from "../types";
import NoteList from "../components/NoteList";

// Lo que hace falta para abrir el formulario: un item de Spotify, un grupo
// local o una nota existente (edición)
interface Draft {
  noteId?: string;
  itemType?: "album" | "track" | "artist";
  spotifyItemId?: string;
  musicItemId?: string;
  name: string;
  artistName?: string | null;
}

// El "vibe" se elige de un clic: color + emoji + etiqueta corta
const VIBE_COLORS = ["#e63946", "#f4a261", "#e9c46a", "#2a9d8f", "#457b9d", "#8338ec"];
const VIBE_EMOJIS = ["🎧", "🔥", "🌧️", "🌙", "🚗", "💃", "🌅", "🎺"];

export default function Notes() {
  const [myNotes, setMyNotes] = useState<Note[]>([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [localGroups, setLocalGroups] = useState<LocalGroup[]>([]);
  const [searching, setSearching] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [text, setText] = useState("");
  const [vibeColor, setVibeColor] = useState<string | null>(null);
  const [vibeEmoji, setVibeEmoji] = useState<string | null>(null);
  const [vibeLabel, setVibeLabel] = useState("");
  // El ancla "si te gusta X": convierte la nota en recomendación dirigida
  const [anchor, setAnchor] = useState<{ id: string; name: string } | null>(null);
  const [anchorQuery, setAnchorQuery] = useState("");
  const [anchorOptions, setAnchorOptions] = useState<SearchArtist[]>([]);
  const [anchorSearching, setAnchorSearching] = useState(false);
  const [newGroupDescription, setNewGroupDescription] = useState("");
  const [newGroupYoutube, setNewGroupYoutube] = useState("");
  const [newGroupSoundcloud, setNewGroupSoundcloud] = useState("");
  const [newGroupCategory, setNewGroupCategory] = useState("");
  const [newGroupProvince, setNewGroupProvince] = useState("");
  const [groupOptions, setGroupOptions] = useState<LocalGroupOptions | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);

  const loadMine = () => {
    api.get<Note[]>("/api/notes/mine").then(setMyNotes).catch(() => {});
  };

  useEffect(loadMine, []);

  useEffect(() => {
    api.get<LocalGroupOptions>("/api/local-groups/options").then(setGroupOptions).catch(() => {});
  }, []);

  const search = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setError("");
    try {
      // Spotify y nuestros grupos locales se buscan a la vez
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

  const openDraft = (draft: Draft) => {
    setDraft(draft);
    setText("");
    setVibeColor(null);
    setVibeEmoji(null);
    setVibeLabel("");
    setAnchor(null);
    setAnchorQuery("");
    setAnchorOptions([]);
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openEdit = (note: Note) => {
    openDraft({
      noteId: note.id,
      name: note.item.name,
      artistName: note.item.artistName,
    });
    setText(note.text ?? "");
    setVibeColor(note.vibeColor);
    setVibeEmoji(note.vibeEmoji);
    setVibeLabel(note.vibeLabel ?? "");
    if (note.anchorArtistSpotifyId && note.anchorArtistName) {
      setAnchor({ id: note.anchorArtistSpotifyId, name: note.anchorArtistName });
    }
  };

  const searchAnchor = async () => {
    if (!anchorQuery.trim()) return;
    setAnchorSearching(true);
    try {
      const q = encodeURIComponent(anchorQuery.trim());
      const found = await api.get<SearchResponse>(`/api/search?q=${q}`);
      setAnchorOptions(found.artists.slice(0, 6));
    } catch {
      setError("No se pudo buscar el artista ancla");
    } finally {
      setAnchorSearching(false);
    }
  };

  const createLocalGroup = async () => {
    setSaving(true);
    setError("");
    try {
      const group = await api.post<LocalGroup>("/api/local-groups", {
        name: query.trim(),
        description: newGroupDescription,
        youtubeUrl: newGroupYoutube,
        soundcloudUrl: newGroupSoundcloud,
        category: newGroupCategory,
        province: newGroupProvince,
      });
      setNewGroupDescription("");
      setNewGroupYoutube("");
      setNewGroupSoundcloud("");
      setNewGroupCategory("");
      setNewGroupProvince("");
      openDraft({ musicItemId: group.id, name: group.name });
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo crear el grupo");
    } finally {
      setSaving(false);
    }
  };

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    setError("");
    const body = { text, vibeColor, vibeEmoji, vibeLabel, anchorArtistId: anchor?.id ?? null };
    try {
      if (draft.noteId) {
        await api.put(`/api/notes/${draft.noteId}`, body);
      } else {
        await api.post("/api/notes", {
          ...body,
          itemType: draft.itemType,
          spotifyItemId: draft.spotifyItemId,
          musicItemId: draft.musicItemId,
        });
      }
      setDraft(null);
      loadMine();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar la nota");
    } finally {
      setSaving(false);
    }
  };

  // Borrar pide un segundo clic en vez de un confirm() del navegador
  const remove = async (note: Note) => {
    if (confirmingDelete !== note.id) {
      setConfirmingDelete(note.id);
      return;
    }
    setConfirmingDelete(null);
    await api.delete(`/api/notes/${note.id}`).catch(() => {});
    loadMine();
  };

  const canSave = text.trim() !== "" || vibeLabel.trim() !== "";

  return (
    <>
      <h1>Notas</h1>
      <p className="muted">
        El contexto de tu música: qué te hace sentir, dónde la escuchas, por qué importa.
      </p>

      {draft && (
        <section className="note-form">
          <h2>
            {draft.noteId ? "Editar nota" : "Nueva nota"}:{" "}
            <span className="accent">{draft.name}</span>
            {draft.artistName && <span className="muted"> — {draft.artistName}</span>}
          </h2>
          <textarea
            placeholder='"Llevo tres días escuchando este puente en bucle…"'
            maxLength={2000}
            rows={4}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <div className="vibe-picker">
            <div className="vibe-row">
              {VIBE_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`vibe-swatch ${vibeColor === color ? "selected" : ""}`}
                  style={{ background: color }}
                  aria-label={`Color ${color}`}
                  onClick={() => setVibeColor(vibeColor === color ? null : color)}
                />
              ))}
            </div>
            <div className="vibe-row">
              {VIBE_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  className={`vibe-emoji ${vibeEmoji === emoji ? "selected" : ""}`}
                  onClick={() => setVibeEmoji(vibeEmoji === emoji ? null : emoji)}
                >
                  {emoji}
                </button>
              ))}
            </div>
            <input
              type="text"
              placeholder="Etiqueta del vibe: Carretera Nocturna, Tarde de lluvia…"
              maxLength={40}
              value={vibeLabel}
              onChange={(e) => setVibeLabel(e.target.value)}
            />
          </div>
          {/* El ancla convierte la nota en recomendación dirigida: le
              llegará a quien ya escucha ese artista aunque no te siga */}
          <div className="anchor-picker">
            {anchor ? (
              <p>
                Si te gusta <strong className="accent">{anchor.name}</strong>{" "}
                <button className="btn-link" onClick={() => setAnchor(null)}>
                  Quitar
                </button>
              </p>
            ) : (
              <>
                <div className="anchor-search">
                  <input
                    type="search"
                    placeholder='¿Recomendación? Ánclala: "si te gusta…" (opcional)'
                    value={anchorQuery}
                    onChange={(e) => setAnchorQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        searchAnchor();
                      }
                    }}
                  />
                  <button
                    className="btn btn-sm"
                    type="button"
                    onClick={searchAnchor}
                    disabled={anchorSearching}
                  >
                    {anchorSearching ? "Buscando…" : "Buscar"}
                  </button>
                </div>
                {anchorOptions.length > 0 && (
                  <div className="vibe-row">
                    {anchorOptions.map((artist) => (
                      <button
                        key={artist.id}
                        type="button"
                        className="tag-chip"
                        onClick={() => {
                          setAnchor({ id: artist.id, name: artist.name });
                          setAnchorOptions([]);
                          setAnchorQuery("");
                        }}
                      >
                        {artist.name}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
          <div className="note-form-actions">
            <button className="btn" onClick={save} disabled={saving || !canSave}>
              {saving ? "Guardando…" : "Guardar"}
            </button>
            <button className="btn-link" onClick={() => setDraft(null)}>
              Cancelar
            </button>
          </div>
          {!canSave && (
            <p className="muted">Escribe algo o ponle al menos la etiqueta del vibe.</p>
          )}
          {error && <p className="error">{error}</p>}
        </section>
      )}

      <section>
        <h2>Buscar sobre qué escribir</h2>
        <form className="search-form" onSubmit={search}>
          <input
            type="search"
            placeholder="Canción, álbum, artista o grupo de tu pueblo…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button className="btn" type="submit" disabled={searching}>
            {searching ? "Buscando…" : "Buscar"}
          </button>
        </form>
        {!draft && error && <p className="error">{error}</p>}

        {results && (
          <div className="search-results">
            <div>
              <h3>Canciones</h3>
              {results.tracks.length === 0 && <p className="muted">Sin resultados.</p>}
              <ul className="user-list">
                {results.tracks.map((track) => (
                  <li key={track.id} className="user-card">
                    {track.imageUrl ? (
                      <img className="cover" src={track.imageUrl} alt="" />
                    ) : (
                      <div className="cover cover-placeholder">♪</div>
                    )}
                    <span>
                      <strong>{track.name}</strong>
                      <span className="muted"> — {track.artistName}</span>
                    </span>
                    <button
                      className="btn btn-sm"
                      onClick={() =>
                        openDraft({
                          itemType: "track",
                          spotifyItemId: track.id,
                          name: track.name,
                          artistName: track.artistName,
                        })
                      }
                    >
                      Nota
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3>Álbumes</h3>
              {results.albums.length === 0 && <p className="muted">Sin resultados.</p>}
              <ul className="user-list">
                {results.albums.map((album) => (
                  <li key={album.id} className="user-card">
                    {album.imageUrl ? (
                      <img className="cover" src={album.imageUrl} alt="" />
                    ) : (
                      <div className="cover cover-placeholder">♪</div>
                    )}
                    <span>
                      <strong>{album.name}</strong>
                      <span className="muted"> — {album.artistName}</span>
                    </span>
                    <button
                      className="btn btn-sm"
                      onClick={() =>
                        openDraft({
                          itemType: "album",
                          spotifyItemId: album.id,
                          name: album.name,
                          artistName: album.artistName,
                        })
                      }
                    >
                      Nota
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3>Artistas</h3>
              {results.artists.length === 0 && <p className="muted">Sin resultados.</p>}
              <ul className="user-list">
                {results.artists.map((artist) => (
                  <li key={artist.id} className="user-card">
                    {artist.imageUrl ? (
                      <img className="cover" src={artist.imageUrl} alt="" />
                    ) : (
                      <div className="cover cover-placeholder">♪</div>
                    )}
                    <strong>{artist.name}</strong>
                    <button
                      className="btn btn-sm"
                      onClick={() =>
                        openDraft({
                          itemType: "artist",
                          spotifyItemId: artist.id,
                          name: artist.name,
                        })
                      }
                    >
                      Nota
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3>Grupos locales</h3>
              <ul className="user-list">
                {localGroups.map((group) => (
                  <li key={group.id} className="user-card">
                    <div className="cover cover-placeholder">🎪</div>
                    <span>
                      <strong>{group.name}</strong>
                      {group.description && <p className="muted">{group.description}</p>}
                    </span>
                    <button
                      className="btn btn-sm"
                      onClick={() => openDraft({ musicItemId: group.id, name: group.name })}
                    >
                      Nota
                    </button>
                  </li>
                ))}
              </ul>
              {/* Si el grupo no existe en Spotify ni aquí, lo creas tú */}
              <div className="new-group">
                <p className="muted">¿No está? Crea "{query.trim()}" como grupo local:</p>
                {/* Qué son y de dónde son, obligatorios: la provincia
                    alimenta la proximidad local del feed */}
                <div className="new-group-row">
                  <select
                    value={newGroupCategory}
                    onChange={(e) => setNewGroupCategory(e.target.value)}
                  >
                    <option value="">Categoría…</option>
                    {groupOptions?.categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <select
                    value={newGroupProvince}
                    onChange={(e) => setNewGroupProvince(e.target.value)}
                  >
                    <option value="">Provincia…</option>
                    {groupOptions?.provinces.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
                <input
                  type="text"
                  placeholder="Descripción: la charanga de las fiestas de… (opcional)"
                  maxLength={500}
                  value={newGroupDescription}
                  onChange={(e) => setNewGroupDescription(e.target.value)}
                />
                {/* Su música no está en Spotify: que se pueda escuchar igual */}
                <input
                  type="url"
                  placeholder="Vídeo de YouTube: youtube.com/watch?v=… (opcional)"
                  maxLength={300}
                  value={newGroupYoutube}
                  onChange={(e) => setNewGroupYoutube(e.target.value)}
                />
                <input
                  type="url"
                  placeholder="Audio de SoundCloud: soundcloud.com/… (opcional)"
                  maxLength={300}
                  value={newGroupSoundcloud}
                  onChange={(e) => setNewGroupSoundcloud(e.target.value)}
                />
                <button
                  className="btn btn-sm"
                  onClick={createLocalGroup}
                  disabled={saving || !newGroupCategory || !newGroupProvince}
                >
                  Crear grupo
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      <section>
        <h2>Mi bitácora</h2>
        <NoteList notes={myNotes} onEdit={openEdit} onDelete={remove} />
        {confirmingDelete && (
          <p className="muted">Pulsa "Borrar" otra vez para confirmar.</p>
        )}
      </section>
    </>
  );
}
