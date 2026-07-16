import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, getMe } from "../api";
import type { FeedEntry, FeedItem, MyProfile, NoteInteractions, Shelf, ShelfItem } from "../types";
import NoteCard from "../components/NoteCard";
import { loadInteractions } from "../components/NoteInteractionsBar";

const COMPOSER_DRAFT_KEY = "sorofy-composer-draft";

// La carátula de un estante; los grupos locales no suelen tener imagen
function ShelfCover({ item }: { item: ShelfItem }) {
  if (item.imageUrl) return <img className="shelf-cover" src={item.imageUrl} alt="" />;
  return (
    <span className="shelf-cover cover-placeholder">
      {item.type === "localGroup" ? "🎺" : "♪"}
    </span>
  );
}

export default function Feed() {
  const navigate = useNavigate();
  const [entries, setEntries] = useState<FeedEntry[]>([]);
  const [shelf, setShelf] = useState<Shelf | null>(null);
  const [listening, setListening] = useState<FeedItem[]>([]);
  const [savedItems, setSavedItems] = useState<Set<string>>(new Set());
  const [interactions, setInteractions] = useState<Map<string, NoteInteractions>>(new Map());
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [me, setMe] = useState<MyProfile | null>(null);
  // Lo que se escribe aquí no crea la nota directamente (toda nota necesita
  // un item vinculado); se guarda y el flujo de Notas lo recoge ya escrito
  const [composerText, setComposerText] = useState(
    () => localStorage.getItem(COMPOSER_DRAFT_KEY) ?? "",
  );

  // Las tarjetas se cargan una vez; el panel de "sonando ahora" se
  // refresca solo cada 30 segundos, como quien mira qué suena
  useEffect(() => {
    api.get<FeedEntry[]>("/api/feed").then((f) => {
      setEntries(f);
      setLoaded(true);
      loadInteractions(f.map((e) => e.note.id)).then(setInteractions).catch(() => {});
    });
    api.get<string[]>("/api/discoveries/mine").then((ids) => setSavedItems(new Set(ids)));
    api.get<Shelf>("/api/feed/shelf").then(setShelf).catch(() => {});

    const loadListening = () =>
      api.get<FeedItem[]>("/api/feed/now-playing").then(setListening).catch(() => {});
    loadListening();
    const interval = setInterval(loadListening, 30_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    getMe().then(setMe).catch(() => {});
  }, []);

  const updateComposerText = (value: string) => {
    setComposerText(value);
    if (value.trim()) {
      localStorage.setItem(COMPOSER_DRAFT_KEY, value);
    } else {
      localStorage.removeItem(COMPOSER_DRAFT_KEY);
    }
  };

  // Ni "vincular" ni "publicar" crean la nota aquí: los dos llevan a Notas
  // a elegir el item, con lo escrito ya guardado
  const goFinishInNotes = () => {
    if (composerText.trim()) localStorage.setItem(COMPOSER_DRAFT_KEY, composerText);
    navigate("/notas");
  };

  // Guardar = a la playlist "Mis Descubrimientos de Sorofy" de tu Spotify
  const save = async (entry: FeedEntry) => {
    setError("");
    try {
      await api.post("/api/discoveries", { noteId: entry.note.id });
      setSavedItems((prev) => new Set(prev).add(entry.note.item.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar");
    }
  };

  const saveAction = (entry: FeedEntry) => {
    if (entry.note.item.type !== "track" || !entry.note.item.spotifyId) return undefined;
    if (savedItems.has(entry.note.item.id)) {
      return <span className="btn btn-sm btn-save is-saved">✓ En tu playlist</span>;
    }
    return (
      <button className="btn btn-ghost btn-sm btn-save" onClick={() => save(entry)}>
        Guardar
      </button>
    );
  };

  const nowListening = listening.filter((i) => i.nowPlaying !== null);
  const hasPanel =
    nowListening.length > 0 ||
    Boolean(shelf && (shelf.weekly.length > 0 || shelf.recent.length > 0));

  if (!loaded) {
    return (
      <div className="loading-state">
        <span className="spinner" />
        Preparando tu feed…
      </div>
    );
  }

  return (
    <>
      <div className="panel" style={{ gap: 12 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
          {me?.avatarUrl ? (
            <img
              className="note-avatar"
              style={{ width: 36, height: 36, fontSize: "0.8rem", flex: "none" }}
              src={me.avatarUrl}
              alt=""
            />
          ) : (
            <span
              className="note-avatar avatar-placeholder"
              style={{ width: 36, height: 36, fontSize: "0.8rem", flex: "none" }}
            >
              {me?.displayName[0]?.toUpperCase() ?? "♪"}
            </span>
          )}
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 10 }}>
            <textarea
              className="composer-textarea"
              rows={2}
              placeholder="¿Qué te ha llegado hoy? Cuéntalo con tus palabras…"
              value={composerText}
              onChange={(e) => updateComposerText(e.target.value)}
            />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
              <button className="btn btn-quiet btn-sm" onClick={goFinishInNotes}>
                🎵 Vincular canción o grupo
              </button>
              <button
                className="btn btn-primary btn-sm"
                disabled={!composerText.trim()}
                onClick={goFinishInNotes}
              >
                Publicar
              </button>
            </div>
          </div>
        </div>
      </div>

    <div className={`feed-layout${hasPanel ? " has-panel" : ""}`}>
      <div className="feed-main">
        {error && <p className="error">{error}</p>}

        {entries.length === 0 ? (
          <div className="empty-state feed-empty">
            <p className="feed-empty-title">Aún no hay notas que descubrir</p>
            <p>
              Cuando la gente de tus sensibilidades escriba, aparecerá aquí.
              Mientras, puedes dejar tú la primera nota.
            </p>
            <Link to="/notas" className="btn btn-ghost feed-empty-cta">
              Escribir una nota
            </Link>
          </div>
        ) : (
          <ul className="feed-masonry">
            {entries.map((entry) => (
              <NoteCard
                key={entry.note.id}
                note={entry.note}
                author={entry.author}
                actions={saveAction(entry)}
                because={entry.becauseArtist}
                becauseFollowedGroup={entry.becauseFollowedGroup}
                becauseLocal={entry.becauseProvince}
                interactions={interactions.get(entry.note.id)}
              />
            ))}
          </ul>
        )}
      </div>

      {/* La columna de contexto (en móvil, arriba): lo que habla tu gente,
          lo recién anotado y quién está escuchando ahora mismo */}
      {hasPanel && (
        <aside className="listening-panel">
          {shelf && shelf.weekly.length > 0 && (
            <>
              <div className="shelf-head">
                <h2 className="section-title shelf-title-sm">De lo que habla tu gente</h2>
              </div>
              <div className="shelf-row">
                {shelf.weekly.map((item) => (
                  <Link key={item.id} to={`/musica/${item.id}`} className="shelf-item">
                    <ShelfCover item={item} />
                    <span className="shelf-title">{item.name}</span>
                    <span className="shelf-sub">{item.artistName ?? item.category ?? ""}</span>
                  </Link>
                ))}
              </div>
            </>
          )}

          {shelf && shelf.recent.length > 0 && (
            <>
              <div className="shelf-head shelf-head-gap">
                <h2 className="section-title shelf-title-sm">Recién anotado…</h2>
              </div>
              <div className="filmstrip">
                {shelf.recent.map((item) => (
                  <Link key={item.id} to={`/musica/${item.id}`} title={item.name}>
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.name} />
                    ) : (
                      <span className="cover-placeholder">
                        {item.type === "localGroup" ? "🎺" : "♪"}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            </>
          )}

          {nowListening.length > 0 && (
            <>
              <span className="listening-title listening-title-gap">
                <span className="dot" />
                Sonando ahora entre tu gente
              </span>
              {nowListening.map((item) => (
                <Link key={item.userId} to={`/gente/${item.userId}`} className="listening-row">
                  <span className="listening-cover cover-placeholder">
                    ♪
                    {item.avatarUrl ? (
                      <img className="listening-mini-avatar" src={item.avatarUrl} alt="" />
                    ) : (
                      <span className="listening-mini-avatar avatar-placeholder">
                        {item.displayName[0]?.toUpperCase()}
                      </span>
                    )}
                  </span>
                  <span className="listening-info">
                    <strong>{item.displayName}</strong>
                    <span>
                      {item.nowPlaying!.track} — {item.nowPlaying!.artist}
                    </span>
                  </span>
                </Link>
              ))}
            </>
          )}
        </aside>
      )}
    </div>
    </>
  );
}
