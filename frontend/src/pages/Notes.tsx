import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { api, getMe } from "../api";
import type {
  LocalGroup,
  LocalGroupOptions,
  Note,
  SearchArtist,
  SearchResponse,
  NowPlaying,
  Shelf,
  ShelfItem,
  TopTrack,
  UnnotedTrack,
} from "../types";
import { LiveEq } from "../components/LiveNow";
import { ripple } from "../ripple";
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
  // La carátula, para la cabecera del formulario ("Tu nota sobre…")
  imageUrl?: string | null;
}

type Tab = "buscar" | "crear" | "bitacora";

// Una nota con texto tiene que contar algo (el backend valida lo mismo)
const MIN_TEXT = 20;

// "Escúchalo aquí" solo acepta YouTube o SoundCloud; avisar al escribir
// evita descubrirlo con el error del servidor al publicar
const isListenUrlValid = (url: string) =>
  /(^|\.)((youtube\.com)|(youtu\.be)|(soundcloud\.com))\//.test(
    url.replace(/^https?:\/\/(www\.|m\.|on\.)?/, ""),
  );

// De dónde sale la carátula al pulsar "Anotar": el formulario la hace volar
// desde ahí hasta su cabecera. Lo escribe la fila pulsada y lo lee el
// efecto que abre el formulario (siempre en el mismo clic).
let pickOrigin: { rect: DOMRect; imageUrl: string | null } | null = null;

// Fila del buscador: carátula, nombre y "Anotar" (toda la fila abre el formulario)
function ResultRow({
  imageUrl,
  round,
  fallback,
  name,
  sub,
  live,
  onPick,
}: {
  imageUrl: string | null;
  round?: boolean;
  fallback?: string;
  name: string;
  sub?: string | null;
  // "Tú la estás escuchando": coincide con lo que suena en tu Spotify
  live?: boolean;
  onPick: () => void;
}) {
  const coverClass = `result-cover${round ? " is-round" : ""}`;
  const pick = (e: React.MouseEvent<HTMLElement>) => {
    const cover = e.currentTarget.closest(".res-row")?.querySelector(".result-cover");
    pickOrigin = cover ? { rect: cover.getBoundingClientRect(), imageUrl } : null;
    onPick();
  };
  return (
    <div className="res-row" onClick={pick}>
      {imageUrl ? (
        <img className={coverClass} src={imageUrl} alt="" />
      ) : (
        <span className={`${coverClass} cover-placeholder`}>{fallback ?? "♪"}</span>
      )}
      <div className="result-name">
        {name}
        {live ? (
          <small className="res-live">
            <LiveEq small />
            Tú la estás escuchando
          </small>
        ) : (
          sub && <small>{sub}</small>
        )}
      </div>
      <button
        className="btn btn-quiet btn-sm"
        data-note-track
        onClick={(e) => {
          e.stopPropagation();
          ripple(e);
          pick(e);
        }}
      >
        Anotar
      </button>
    </div>
  );
}

export default function Notes() {
  const [tab, setTab] = useState<Tab>("buscar");
  const [myNotes, setMyNotes] = useState<Note[]>([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [localGroups, setLocalGroups] = useState<LocalGroup[]>([]);
  const [searching, setSearching] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [text, setText] = useState("");
  // El vibe es una etiqueta de texto libre; color y emoji sobreviven solo
  // en las notas viejas (se conservan al editar, ya no se eligen)
  const [vibeColor, setVibeColor] = useState<string | null>(null);
  const [vibeEmoji, setVibeEmoji] = useState<string | null>(null);
  // Ya no se elige etiqueta al escribir; solo se conserva la de notas antiguas al editarlas
  const [vibeLabel, setVibeLabel] = useState("");
  // "Escúchalo aquí": enlace opcional al audio exacto del que habla la nota
  const [listenUrl, setListenUrl] = useState("");
  // El ancla "si te gusta X": convierte la nota en recomendación dirigida
  const [anchor, setAnchor] = useState<{ id: string; name: string } | null>(null);
  const [anchorQuery, setAnchorQuery] = useState("");
  const [anchorOptions, setAnchorOptions] = useState<SearchArtist[]>([]);
  const [anchorSearching, setAnchorSearching] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDescription, setNewGroupDescription] = useState("");
  // El primer vídeo es el principal del perfil; el resto, material extra
  const [newGroupYoutubes, setNewGroupYoutubes] = useState<string[]>([""]);
  const [newGroupSoundcloud, setNewGroupSoundcloud] = useState("");
  const [newGroupRepertoire, setNewGroupRepertoire] = useState("");
  const [newGroupCategory, setNewGroupCategory] = useState("");
  const [newGroupProvince, setNewGroupProvince] = useState("");
  const [groupOptions, setGroupOptions] = useState<LocalGroupOptions | null>(null);
  // Sugerencias para la etiqueta del vibe: las que ya usó la comunidad
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

  // Texto escrito en el composer rápido del feed, a la espera de que aquí
  // se elija el item: una nota siempre necesita uno, así que no se publica
  // sola (a diferencia del prototipo, que la creaba sin vincular nada)
  const [pendingComposerText, setPendingComposerText] = useState("");
  useEffect(() => {
    const draft = localStorage.getItem("sorofy-composer-draft");
    if (draft) {
      setPendingComposerText(draft);
      localStorage.removeItem("sorofy-composer-draft");
    }
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

  // Búsqueda en tiempo real: se lanza sola al dejar de teclear un momento.
  // El contador descarta respuestas viejas que lleguen tarde.
  const searchSeq = useRef(0);
  const runSearch = async (raw: string) => {
    const seq = ++searchSeq.current;
    setSearching(true);
    setError("");
    try {
      // Spotify y nuestros grupos locales se buscan a la vez
      const q = encodeURIComponent(raw);
      const [spotify, groups] = await Promise.all([
        api.get<SearchResponse>(`/api/search?q=${q}`),
        api.get<LocalGroup[]>(`/api/local-groups?query=${q}`),
      ]);
      if (seq !== searchSeq.current) return;
      setResults(spotify);
      setLocalGroups(groups);
    } catch {
      if (seq === searchSeq.current) setError("No se pudo buscar");
    } finally {
      if (seq === searchSeq.current) setSearching(false);
    }
  };

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      searchSeq.current++;
      setResults(null);
      setLocalGroups([]);
      setSearching(false);
      return;
    }
    const timer = setTimeout(() => runSearch(q), 350);
    return () => clearTimeout(timer);
    // runSearch solo depende de query
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  // Enter busca ya, sin esperar la pausa
  const search = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim().length >= 2) runSearch(query.trim());
  };

  // Cabecera v2: lo que suena ahora en tu Spotify y lo que más escuchas sin anotar
  const [myNow, setMyNow] = useState<NowPlaying | null>(null);
  const [unnoted, setUnnoted] = useState<UnnotedTrack[]>([]);
  useEffect(() => {
    api.get<NowPlaying>("/api/me/now-playing").then(setMyNow).catch(() => {});
    api.get<UnnotedTrack[]>("/api/me/unnoted").then(setUnnoted).catch(() => {});
  }, []);
  const myNowId = myNow?.playing ? myNow.spotifyId ?? null : null;

  // Ejemplos antes de escribir: tus canciones de Spotify y lo que anota la gente
  const [myTopTracks, setMyTopTracks] = useState<TopTrack[]>([]);
  const [communityItems, setCommunityItems] = useState<ShelfItem[]>([]);
  useEffect(() => {
    getMe().then((me) => setMyTopTracks(me.topTracks.slice(0, 6))).catch(() => {});
    api
      .get<Shelf>("/api/feed/shelf")
      .then((shelf) => {
        const seen = new Set<string>();
        setCommunityItems(
          [...shelf.weekly, ...shelf.recent].filter((i) => !seen.has(i.id) && seen.add(i.id)).slice(0, 6),
        );
      })
      .catch(() => {});
  }, []);

  const formRef = useRef<HTMLElement>(null);
  const formArtRef = useRef<HTMLElement>(null);
  const [flyTick, setFlyTick] = useState(0);

  const openDraft = (draft: Draft) => {
    setTab("buscar");
    setDraft({ ...draft, imageUrl: draft.imageUrl ?? pickOrigin?.imageUrl ?? null });
    setFlyTick((t) => t + 1);
    setText(pendingComposerText);
    setPendingComposerText("");
    setVibeColor(null);
    setVibeEmoji(null);
    setVibeLabel("");
    setListenUrl("");
    setAnchor(null);
    setAnchorQuery("");
    setAnchorOptions([]);
    setError("");
  };

  // Al abrir el formulario: se lleva a la vista y la carátula vuela desde la
  // fila pulsada hasta su cabecera (como en el prototipo); luego, foco al texto
  useLayoutEffect(() => {
    const form = formRef.current;
    if (!flyTick || !form) return;
    const origin = pickOrigin;
    pickOrigin = null;
    window.scrollTo({ top: form.getBoundingClientRect().top + window.scrollY - 90 });
    const art = formArtRef.current;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (origin && art && origin.rect.width > 0 && !reduced) {
      const dst = art.getBoundingClientRect();
      const fly = document.createElement("div");
      fly.className = "note-fly";
      Object.assign(fly.style, {
        left: `${origin.rect.left}px`,
        top: `${origin.rect.top}px`,
        width: `${origin.rect.width}px`,
        height: `${origin.rect.height}px`,
        transformOrigin: "0 0",
        backgroundImage: origin.imageUrl ? `url("${origin.imageUrl}")` : "linear-gradient(135deg,#7b6cff,#3a3466)",
      });
      document.body.appendChild(fly);
      art.style.opacity = "0";
      const dx = dst.left - origin.rect.left;
      const dy = dst.top - origin.rect.top;
      const sx = dst.width / origin.rect.width;
      const sy = dst.height / origin.rect.height;
      fly.animate(
        [
          { transform: "translate(0,0) scale(1)" },
          { transform: `translate(${dx * 0.5}px,${dy * 0.5 - 60}px) scale(${1 + (sx - 1) * 0.5},${1 + (sy - 1) * 0.5})`, offset: 0.55 },
          { transform: `translate(${dx}px,${dy}px) scale(${sx},${sy})` },
        ],
        { duration: 620, easing: "cubic-bezier(.5,0,.2,1)", fill: "forwards" },
      ).onfinish = () => {
        art.style.opacity = "";
        fly.remove();
        art.animate([{ transform: "scale(1.12)" }, { transform: "scale(1)" }], { duration: 320, easing: "cubic-bezier(.2,.8,.2,1)" });
      };
    }
    form.animate(
      [{ boxShadow: "0 0 0 0 rgba(123,108,255,0.7)" }, { boxShadow: "0 0 0 14px rgba(123,108,255,0)" }],
      { duration: 900, delay: 450 },
    );
    const textarea = form.querySelector("textarea");
    const timer = setTimeout(() => textarea?.focus({ preventScroll: true }), 450);
    return () => clearTimeout(timer);
  }, [flyTick]);

  const openEdit = (note: Note) => {
    pickOrigin = null;
    openDraft({
      noteId: note.id,
      name: note.item.name,
      artistName: note.item.artistName,
      imageUrl: note.item.imageUrl,
    });
    setText(note.text ?? "");
    // El color y emoji viejos viajan de vuelta tal cual: no hay UI para
    // cambiarlos, pero editar el texto no debe borrárselos a la tarjeta
    setVibeColor(note.vibeColor);
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
    const [mainYoutube, ...extraYoutubes] = newGroupYoutubes.map((u) => u.trim());
    try {
      const group = await api.post<LocalGroup>("/api/local-groups", {
        name: newGroupName.trim(),
        description: newGroupDescription,
        youtubeUrl: mainYoutube,
        extraYoutubeUrls: extraYoutubes.filter((u) => u !== ""),
        soundcloudUrl: newGroupSoundcloud,
        category: newGroupCategory,
        province: newGroupProvince,
        repertoire: newGroupRepertoire,
      });
      setNewGroupName("");
      setNewGroupDescription("");
      setNewGroupYoutubes([""]);
      setNewGroupSoundcloud("");
      setNewGroupCategory("");
      setNewGroupProvince("");
      setNewGroupRepertoire("");
      // El perfil ya existe: directos al formulario de la primera nota
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

  const textTooShort = text.trim() !== "" && text.trim().length < MIN_TEXT;
  const listenUrlInvalid = listenUrl.trim() !== "" && !isListenUrlValid(listenUrl.trim());
  const canSave =
    text.trim().length >= MIN_TEXT &&
    !listenUrlInvalid;

  const tabButton = (id: Tab, label: string) => (
    <button
      className={`tab-btn${tab === id ? " is-active" : ""}`}
      role="tab"
      aria-selected={tab === id}
      onClick={() => setTab(id)}
    >
      {label}
    </button>
  );

  return (
    <>
      <header className="notas-hero">
        <span className="notas-kicker">NOTAS</span>
        <h2 className="notas-h">¿Qué te ha tocado hoy?</h2>
        <p className="section-sub">
          Busca una canción, un disco o el grupo de tu pueblo y cuenta qué te pasó con él.
        </p>
        <form
          className="notas-search"
          onSubmit={(e) => {
            setTab("buscar");
            search(e);
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            type="search"
            placeholder="Canción, álbum, artista o grupo de tu pueblo…"
            aria-label="Buscar música"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setTab("buscar");
            }}
          />
          <button className="btn btn-primary btn-sm" type="submit">
            Buscar
          </button>
        </form>
        {myNow?.playing && myNow.spotifyId && (
          <div className="me-now">
            {myNow.imageUrl ? (
              <img className="me-now-art" src={myNow.imageUrl} alt="" />
            ) : (
              <span className="me-now-art cover-placeholder">♪</span>
            )}
            <div className="me-now-txt">
              <small>TÚ ESTÁS ESCUCHANDO</small>
              <span>
                {myNow.track} — {myNow.artist}
              </span>
            </div>
            <button
              className="btn btn-ghost btn-sm"
              data-note-track
              onClick={(e) => {
                ripple(e);
                const art = e.currentTarget.closest(".me-now")?.querySelector(".me-now-art");
                pickOrigin = art ? { rect: art.getBoundingClientRect(), imageUrl: myNow.imageUrl ?? null } : null;
                openDraft({
                  itemType: "track",
                  spotifyItemId: myNow.spotifyId!,
                  name: myNow.track ?? "",
                  artistName: myNow.artist,
                });
              }}
            >
              Anotar esta
            </button>
          </div>
        )}
        {pendingComposerText && !draft && (
          <p className="section-sub accent">Tu nota del feed está lista — busca de qué habla.</p>
        )}
      </header>

      {unnoted.length > 0 && (
        <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="live-head">
            <h3>Te ha sonado mucho y aún no has dicho nada</h3>
            <span className="live-count">de lo que más escuchas</span>
          </div>
          <div className="live-rail">
            {unnoted.map((t, i) => (
              <article key={t.spotifyTrackId} className="live-card">
                {t.imageUrl ? (
                  <img className="live-cover" src={t.imageUrl} alt="" />
                ) : (
                  <span className="live-cover cover-placeholder">♪</span>
                )}
                <div className="live-track">
                  <strong>{t.name}</strong>
                  <span>{t.artistName}</span>
                </div>
                {t.albumName && <span className="pend-hint">del disco {t.albumName}</span>}
                <button
                  className={`btn ${i === 0 ? "btn-primary" : "btn-quiet"} btn-sm`}
                  data-note-track
                  onClick={(e) => {
                    ripple(e);
                    const cover = e.currentTarget.closest(".live-card")?.querySelector(".live-cover");
                    pickOrigin = cover ? { rect: cover.getBoundingClientRect(), imageUrl: t.imageUrl } : null;
                    openDraft({ itemType: "track", spotifyItemId: t.spotifyTrackId, name: t.name, artistName: t.artistName });
                  }}
                >
                  Anotar
                </button>
              </article>
            ))}
          </div>
        </section>
      )}

      <div className="tab-bar" role="tablist">
        {tabButton("buscar", "Buscar y anotar")}
        {tabButton("crear", "Crear perfil")}
        {tabButton("bitacora", "Mi bitácora")}
      </div>

      {tab === "buscar" && (
        <div className="tab-panel is-active">
          <div className="notas-grid">
          <section className="panel search-panel">
            <h3 className="section-title" style={{ fontSize: "1.05rem" }}>
              {results ? `Resultados para «${query.trim()}»` : "Para empezar"}
            </h3>
            {searching && (
              <div className="loading-state">
                <span className="spinner" />
                Buscando…
              </div>
            )}
            {!draft && error && <p className="field-error">{error}</p>}

            {!results && !searching && query.trim().length < 2 && (
              <>
                {myTopTracks.length > 0 && (
                  <>
                    <div className="search-cat">De lo que más escuchas</div>
                    {myTopTracks.map((track) => (
                      <ResultRow
                        key={track.spotifyTrackId}
                        imageUrl={track.imageUrl}
                        name={track.name}
                        sub={track.artistName}
                        onPick={() =>
                          openDraft({
                            itemType: "track",
                            spotifyItemId: track.spotifyTrackId,
                            name: track.name,
                            artistName: track.artistName,
                          })
                        }
                      />
                    ))}
                  </>
                )}
                {communityItems.length > 0 && (
                  <>
                    <div className="search-cat">Lo que está anotando la gente</div>
                    {communityItems.map((item) => (
                      <ResultRow
                        key={item.id}
                        imageUrl={item.imageUrl}
                        fallback={item.type === "localGroup" ? "🎪" : undefined}
                        round={item.type === "artist"}
                        name={item.name}
                        sub={
                          item.artistName ??
                          (item.type === "localGroup" ? item.category ?? "grupo local" : item.type === "artist" ? "artista" : "")
                        }
                        onPick={() => openDraft({ musicItemId: item.id, name: item.name, artistName: item.artistName })}
                      />
                    ))}
                  </>
                )}
              </>
            )}

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
                    live={track.id === myNowId}
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
                {localGroups.length === 0 && <p className="section-sub">Sin resultados.</p>}
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
              </>
            )}

            {/* Si el grupo no existe en Spotify ni aquí, lo creas tú */}
            <div className="new-group-cta">
              <span className="section-sub">
                ¿No encuentras al grupo de tu pueblo, tu peña o tu proyecto?
              </span>
              <button
                className="btn btn-quiet btn-sm"
                onClick={() => {
                  if (!newGroupName && query.trim()) setNewGroupName(query.trim());
                  setTab("crear");
                }}
              >
                Crear perfil
              </button>
            </div>
          </section>
          {draft && (
            <section className="panel" ref={formRef as React.RefObject<HTMLElement>}>
              <div className="form-subject">
                {draft.imageUrl ? (
                  <img ref={formArtRef as React.RefObject<HTMLImageElement>} className="form-subject-art" src={draft.imageUrl} alt="" />
                ) : (
                  <span ref={formArtRef as React.RefObject<HTMLSpanElement>} className="form-subject-art cover-placeholder">
                    {draft.itemType ? "♪" : "🎪"}
                  </span>
                )}
                <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
                  <span className="form-subject-k">{draft.noteId ? "EDITAS TU NOTA SOBRE" : "TU NOTA SOBRE"}</span>
                  <span className="form-subject-t">{draft.name}</span>
                  {draft.artistName && <span className="form-subject-s">{draft.artistName}</span>}
                </div>
              </div>

              <div className={`field${textTooShort ? " has-error" : ""}`}>
                <textarea
                  placeholder="¿Dónde estabas la primera vez que la escuchaste? ¿A quién se la pondrías?"
                  maxLength={2000}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                />
                {textTooShort && (
                  <span className="field-error">
                    Cuéntanos un poco más: una nota necesita al menos {MIN_TEXT} caracteres.
                  </span>
                )}
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

              {/* El audio exacto del que habla la nota: la versión en directo,
                  el set, el tema que no está en Spotify... */}
              <div className={`field${listenUrlInvalid ? " has-error" : ""}`}>
                <label>Escúchalo aquí (opcional): el directo o set exacto del que hablas</label>
                <input
                  type="url"
                  placeholder="Enlace de YouTube o SoundCloud"
                  maxLength={300}
                  value={listenUrl}
                  onChange={(e) => setListenUrl(e.target.value)}
                />
                {listenUrlInvalid && (
                  <span className="field-error">
                    Ese enlace no parece de YouTube ni SoundCloud. Revísalo.
                  </span>
                )}
                <span className="section-sub field-hint">
                  Si lo añades, este enlace manda sobre el player por defecto de la canción.
                </span>
              </div>

              <div className="form-foot">
                {!canSave && !textTooShort && !listenUrlInvalid && (
                  <span className="section-sub">
                    Cuéntalo con tus palabras: al menos {MIN_TEXT} caracteres.
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

          </div>
        </div>
      )}

      {tab === "crear" && (
        <div className="tab-panel is-active">
          <section className="panel">
            <div className="form-head">
              <h2 className="section-title form-title">Crea el perfil de tu grupo o el tuyo</h2>
              <p className="section-sub">
                Para la charanga, la peña, la banda de tu cuadrilla o tu proyecto
                en solitario que no está en Spotify.
              </p>
            </div>
            <div className="field">
              <label>Nombre</label>
              <input
                type="text"
                placeholder="Ej. Charanga El Trueno"
                maxLength={200}
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
              />
            </div>
            {/* Qué son y de dónde son, obligatorios: la provincia alimenta
                la proximidad local del feed */}
            <div className="form-row form-row-grid">
              <div className="field">
                <label>Categoría (obligatoria)</label>
                <select
                  value={newGroupCategory}
                  onChange={(e) => setNewGroupCategory(e.target.value)}
                >
                  <option value="">Elige una…</option>
                  {groupOptions?.categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Provincia (obligatoria)</label>
                <select
                  value={newGroupProvince}
                  onChange={(e) => setNewGroupProvince(e.target.value)}
                >
                  <option value="">Elige una…</option>
                  {groupOptions?.provinces.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="field">
              <label>Anécdotas del grupo (opcional)</label>
              <textarea
                placeholder="Cómo empezasteis, una noche que recordéis siempre, por qué el nombre… lo que haría que alguien os reconociera."
                maxLength={500}
                value={newGroupDescription}
                onChange={(e) => setNewGroupDescription(e.target.value)}
              />
            </div>
            {/* Su música no está en Spotify: que se pueda escuchar igual */}
            <div className="field">
              <label>Vídeos de YouTube (opcional)</label>
              {newGroupYoutubes.map((url, i) => (
                <input
                  key={i}
                  type="url"
                  placeholder={i === 0 ? "Enlace a un directo o vídeo vuestro" : "Otro enlace de YouTube"}
                  maxLength={300}
                  value={url}
                  onChange={(e) =>
                    setNewGroupYoutubes((prev) => prev.map((u, j) => (j === i ? e.target.value : u)))
                  }
                />
              ))}
              <button
                className="btn btn-quiet btn-sm add-video"
                type="button"
                onClick={() => setNewGroupYoutubes((prev) => [...prev, ""])}
              >
                + Añadir otro vídeo
              </button>
            </div>
            <div className="field">
              <label>SoundCloud (opcional)</label>
              <input
                type="url"
                placeholder="Enlace a su perfil o a una pista"
                maxLength={300}
                value={newGroupSoundcloud}
                onChange={(e) => setNewGroupSoundcloud(e.target.value)}
              />
            </div>
            <div className="field">
              <label>Repertorio de siempre (opcional)</label>
              <input
                type="text"
                placeholder="Lo que no falla en ningún pueblo, separado por comas"
                maxLength={500}
                value={newGroupRepertoire}
                onChange={(e) => setNewGroupRepertoire(e.target.value)}
              />
            </div>
            {error && <p className="field-error">{error}</p>}
            <button
              className="btn btn-primary create-group-submit"
              onClick={createLocalGroup}
              disabled={saving || !newGroupName.trim() || !newGroupCategory || !newGroupProvince}
            >
              {saving ? "Creando…" : "Crear perfil"}
            </button>
            <p className="section-sub field-hint">
              El botón se activa con el nombre, la categoría y la provincia.
            </p>
          </section>
        </div>
      )}

      {tab === "bitacora" && (
        <div className="tab-panel is-active">
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
        </div>
      )}
    </>
  );
}
