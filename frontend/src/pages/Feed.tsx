import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import type { FeedEntry, FeedItem, NoteInteractions, Shelf, ShelfItem } from "../types";
import NoteCard from "../components/NoteCard";
import { loadInteractions } from "../components/NoteInteractionsBar";

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
  const [entries, setEntries] = useState<FeedEntry[]>([]);
  const [shelf, setShelf] = useState<Shelf | null>(null);
  const [listening, setListening] = useState<FeedItem[]>([]);
  const [savedItems, setSavedItems] = useState<Set<string>>(new Set());
  const [interactions, setInteractions] = useState<Map<string, NoteInteractions>>(new Map());
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");

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
      {shelf && shelf.weekly.length > 0 && (
        <div className="shelf">
          <div className="shelf-head">
            <h2 className="section-title">De lo que habla tu gente esta semana</h2>
            <span className="note-track-date">sin rankings — solo notas</span>
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
        </div>
      )}

      {shelf && shelf.recent.length > 0 && (
        <div className="shelf">
          <div className="shelf-head">
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
        </div>
      )}

    <div className={`feed-layout${nowListening.length > 0 ? " has-panel" : ""}`}>
      <div className="feed-main">
        {error && <p className="error">{error}</p>}

        {entries.length === 0 ? (
          <p className="empty-state">
            Aún no hay notas que descubrir.{" "}
            <Link to="/gente" className="accent">Sigue a alguien</Link> o{" "}
            <Link to="/notas" className="accent">escribe la primera</Link>.
          </p>
        ) : (
          <ul className="feed-masonry">
            {entries.map((entry) => (
              <NoteCard
                key={entry.note.id}
                note={entry.note}
                author={entry.author}
                actions={saveAction(entry)}
                because={entry.becauseArtist}
                becauseLocal={entry.becauseProvince}
                interactions={interactions.get(entry.note.id)}
              />
            ))}
          </ul>
        )}
      </div>

      {nowListening.length > 0 && (
        <aside className="listening-panel">
          <span className="listening-title">
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
        </aside>
      )}
    </div>
    </>
  );
}
