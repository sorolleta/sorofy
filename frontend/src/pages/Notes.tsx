import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { api } from "../api";
import type { LocalGroup, LocalGroupOptions, Note, SearchArtist, SearchResponse } from "../types";
import NoteList from "../components/NoteList";
import { VIBES, resolveVibe } from "../vibes";

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
const VIBE_EMOJIS = ["🎺", "🌊", "🌙", "🔥", "🚗", "🍷", "🌧️", "💃"];

// Fila del buscador: carátula, nombre y el botón que abre el formulario
function ResultRow({
  imageUrl,
  round,
  fallback,
  name,
  sub,
  onPick,
}: {
  imageUrl: string | null;
  round?: boolean;
  fallback?: string;
  name: string;
  sub?: string | null;
  onPick: () => void;
}) {
  const coverClass = `result-cover${round ? " is-round" : ""}`;
  return (
    <div className="result-row">
      {imageUrl ? (
        <img className={coverClass} src={imageUrl} alt="" />
      ) : (
        <span className={`${coverClass} cover-placeholder`}>{fallback ?? "♪"}</span>
      )}
      <div className="result-name">
        {name}
        {sub && <small>{sub}</small>}
      </div>
      <button className="btn btn-quiet btn-sm" onClick={onPick}>
        Nota
      </button>
    </div>
  );
}

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
  // "Escúchalo aquí": enlace opcional al audio exacto del que habla la nota
  const [listenUrl, setListenUrl] = useState("");
  // El ancla "si te gusta X": convierte la nota en recomendación dirigida
  const [anchor, setAnchor] = useState<{ id: string; name: string } | null>(null);
  const [anchorQuery, setAnchorQuery] = useState("");
  const [anchorOptions, setAnchorOptions] = useState<SearchArtist[]>([]);
  const [anchorSearching, setAnchorSearching] = useState(false);
  const [showNewGroup, setShowNewGroup] = useState(false);
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

  // La ficha de un item ("Escribir una nota") llega con el item ya elegido
  const location = useLocation();
  useEffect(() => {
    const incoming = (location.state as { noteDraft?: Draft } | null)?.noteDraft;
    if (incoming) {
      openDraft(incoming);
      // Limpiar el state para que recargar no reabra el formulario
      window.history.replaceState({}, "");
    }
    // Solo al montar: openDraft es estable y location.state llega con la navegación
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    setListenUrl("");
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
    // Los vibes viejos se normalizan a la paleta nueva al editar
    setVibeColor(note.vibeColor ? resolveVibe(note.vibeColor).hex : null);
    setVibeEmoji(note.vibeEmoji);
    setVibeLabel(note.vibeLabel ?? "");
    setListenUrl(note.listenUrl ?? "");
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
      setShowNewGroup(false);
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
    const body = {
      text,
      vibeColor,
      vibeEmoji,
      vibeLabel,
      listenUrl,
      anchorArtistId: anchor?.id ?? null,
    };
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
  const previewVibe = vibeColor ? resolveVibe(vibeColor) : null;

  return (
    <>
      <div className="page-head">
        <h1 className="section-title">Deja una nota</h1>
        <p className="section-sub">
          Busca lo que te ha tocado hoy — una canción, un disco, la charanga
          de tu pueblo — y cuéntalo con tus palabras.
        </p>
      </div>

      {draft && (
        <section className="panel">
          <div className="form-head">
            <h2 className="section-title form-title">
              {draft.noteId ? "Editar tu nota sobre" : "Tu nota sobre"} <em>{draft.name}</em>
            </h2>
            {draft.artistName && <span className="note-track-date">{draft.artistName}</span>}
          </div>

          <div className="field">
            <textarea
              placeholder="¿Dónde estabas la primera vez que la escuchaste? ¿A quién se la pondrías?"
              maxLength={2000}
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </div>

          <div className="field">
            <label>Vibe (opcional): un color, un emoji y tu etiqueta</label>
            <div className="vibe-dots">
              {VIBES.map((vibe) => (
                <button
                  key={vibe.hex}
                  type="button"
                  className={`vibe-dot${vibeColor === vibe.hex ? " is-selected" : ""}`}
                  style={{ background: vibe.hex }}
                  aria-label={`Color ${vibe.hex}`}
                  onClick={() => setVibeColor(vibeColor === vibe.hex ? null : vibe.hex)}
                />
              ))}
            </div>
            <div className="emoji-row">
              {VIBE_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  className={`emoji-pick${vibeEmoji === emoji ? " is-selected" : ""}`}
                  onClick={() => setVibeEmoji(vibeEmoji === emoji ? null : emoji)}
                >
                  {emoji}
                </button>
              ))}
            </div>
            <input
              type="text"
              placeholder="Tu etiqueta, ej. Mar de invierno"
              maxLength={40}
              value={vibeLabel}
              onChange={(e) => setVibeLabel(e.target.value)}
            />
            {/* Preview en vivo: el chip tal y como se verá en la tarjeta */}
            {previewVibe && (vibeEmoji || vibeLabel) && (
              <span
                className="vibe-chip"
                style={{ background: previewVibe.hex, color: previewVibe.ink }}
              >
                {vibeEmoji && <span>{vibeEmoji}</span>}
                {vibeLabel || "Tu etiqueta"}
              </span>
            )}
          </div>

          {/* El audio exacto del que habla la nota: la versión en directo,
              el set, el tema que no está en Spotify... */}
          <div className="field">
            <label>Escúchalo aquí (opcional): la versión exacta de la que hablas</label>
            <input
              type="url"
              placeholder="Enlace de YouTube o SoundCloud"
              maxLength={300}
              value={listenUrl}
              onChange={(e) => setListenUrl(e.target.value)}
            />
          </div>

          {/* El ancla convierte la nota en recomendación dirigida: le
              llegará a quien ya escucha ese artista aunque no te siga */}
          <div className="field">
            <label>¿Recomendación? Ánclala: «si te gusta…»</label>
            {anchor ? (
              <span className="anchor-chip">
                Si te gusta <strong className="anchor-name">{anchor.name}</strong>
                <button className="anchor-remove" onClick={() => setAnchor(null)}>
                  Quitar
                </button>
              </span>
            ) : (
              <>
                <div className="form-row">
                  <input
                    type="search"
                    placeholder="Busca un artista para anclar"
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
                    className="btn btn-quiet btn-sm"
                    type="button"
                    onClick={searchAnchor}
                    disabled={anchorSearching}
                  >
                    {anchorSearching ? "Buscando…" : "Buscar"}
                  </button>
                </div>
                {anchorOptions.length > 0 && (
                  <div className="chip-row">
                    {anchorOptions.map((artist) => (
                      <button
                        key={artist.id}
                        type="button"
                        className="btn btn-quiet btn-sm"
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

          <div className="form-foot">
            {!canSave && (
              <span className="section-sub">
                Escribe algo o ponle al menos la etiqueta del vibe.
              </span>
            )}
            <button className="btn btn-quiet" onClick={() => setDraft(null)}>
              Cancelar
            </button>
            <button className="btn btn-primary" onClick={save} disabled={saving || !canSave}>
              {saving ? "Guardando…" : draft.noteId ? "Guardar cambios" : "Publicar nota"}
            </button>
          </div>
          {error && <p className="field-error">{error}</p>}
        </section>
      )}

      <section className="panel search-panel">
        <form className="field" onSubmit={search}>
          <input
            type="search"
            placeholder="Canción, álbum, artista o grupo de tu pueblo…"
            aria-label="Buscar música"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </form>
        {searching && (
          <div className="loading-state">
            <span className="spinner" />
            Buscando…
          </div>
        )}
        {!draft && error && <p className="field-error">{error}</p>}

        {results && (
          <>
            <div className="search-cat">Canciones</div>
            {results.tracks.length === 0 && <p className="section-sub">Sin resultados.</p>}
            {results.tracks.map((track) => (
              <ResultRow
                key={track.id}
                imageUrl={track.imageUrl}
                name={track.name}
                sub={track.artistName}
                onPick={() =>
                  openDraft({
                    itemType: "track",
                    spotifyItemId: track.id,
                    name: track.name,
                    artistName: track.artistName,
                  })
                }
              />
            ))}

            <div className="search-cat">Álbumes</div>
            {results.albums.length === 0 && <p className="section-sub">Sin resultados.</p>}
            {results.albums.map((album) => (
              <ResultRow
                key={album.id}
                imageUrl={album.imageUrl}
                name={album.name}
                sub={album.artistName}
                onPick={() =>
                  openDraft({
                    itemType: "album",
                    spotifyItemId: album.id,
                    name: album.name,
                    artistName: album.artistName,
                  })
                }
              />
            ))}

            <div className="search-cat">Artistas</div>
            {results.artists.length === 0 && <p className="section-sub">Sin resultados.</p>}
            {results.artists.map((artist) => (
              <ResultRow
                key={artist.id}
                imageUrl={artist.imageUrl}
                round
                name={artist.name}
                sub="artista"
                onPick={() =>
                  openDraft({
                    itemType: "artist",
                    spotifyItemId: artist.id,
                    name: artist.name,
                  })
                }
              />
            ))}

            <div className="search-cat">Grupos locales</div>
            {localGroups.map((group) => (
              <ResultRow
                key={group.id}
                imageUrl={group.imageUrl ?? null}
                fallback="🎪"
                name={group.name}
                sub={group.description}
                onPick={() => openDraft({ musicItemId: group.id, name: group.name })}
              />
            ))}

            {/* Si el grupo no existe en Spotify ni aquí, lo creas tú */}
            <div className="new-group-cta">
              <span className="section-sub">¿No encuentras al grupo de tu pueblo?</span>
              <button
                className="btn btn-quiet btn-sm"
                onClick={() => setShowNewGroup(!showNewGroup)}
              >
                Crear grupo local
              </button>
            </div>
            {showNewGroup && (
              <div className="new-group">
                <p className="section-sub">Crear "{query.trim()}" como grupo local:</p>
                {/* Qué son y de dónde son, obligatorios: la provincia
                    alimenta la proximidad local del feed */}
                <div className="form-row">
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
                  className="btn btn-primary btn-sm"
                  onClick={createLocalGroup}
                  disabled={saving || !newGroupCategory || !newGroupProvince}
                >
                  Crear grupo
                </button>
              </div>
            )}
          </>
        )}
      </section>

      <div className="page-head">
        <h2 className="section-title">Mi bitácora</h2>
        <p className="section-sub">Tus notas, en orden. Solo tú puedes editarlas o borrarlas.</p>
      </div>
      <NoteList
        notes={myNotes}
        onEdit={openEdit}
        onDelete={remove}
        confirmingDelete={confirmingDelete}
      />
    </>
  );
}
