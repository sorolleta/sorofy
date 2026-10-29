import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, getMe } from "../api";
import type {
  FeedEntry,
  FeedItem,
  LiveTrack,
  MyProfile,
  NoteInteractions,
  Shelf,
  ShelfItem,
} from "../types";
import LiveNow from "../components/LiveNow";
import NoteCard from "../components/NoteCard";
import { loadInteractions } from "../components/NoteInteractionsBar";

const COMPOSER_DRAFT_KEY = "sorofy-composer-draft";

// El diario por días: lo de las últimas 24 h en tarjetas (cronológico),
// la semana resumida por obra (cuántas notas y de quién) y lo anterior en tarjetas
type Day = "hoy" | "semana" | "antes";
const DAY_MS = 24 * 60 * 60 * 1000;
function dayOf(iso: string): Day {
  const age = Date.now() - new Date(iso).getTime();
  if (age < DAY_MS) return "hoy";
  if (age < 7 * DAY_MS) return "semana";
  return "antes";
}
const newestFirst = (a: FeedEntry, b: FeedEntry) =>
  new Date(b.note.createdAt).getTime() - new Date(a.note.createdAt).getTime();

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
  // Lo que suena en tu círculo: cada 15 s (el servidor lo cachea) y al acabar cada canción
  const loadListening = () =>
    api.get<FeedItem[]>("/api/feed/now-playing").then(setListening).catch(() => {});
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

    loadListening();
    const interval = setInterval(loadListening, 15_000);
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

  const hasPanel = Boolean(shelf && (shelf.weekly.length > 0 || shelf.recent.length > 0));

  // "Anotar" desde lo que suena: abre Notas con la canción ya elegida
  const noteLive = (t: LiveTrack) =>
    navigate("/notas", {
      state: { noteDraft: { itemType: "track", spotifyItemId: t.spotifyId, name: t.track, artistName: t.artist } },
    });

  const byDay = (d: Day) => entries.filter((e) => dayOf(e.note.createdAt) === d);
  const cards = (list: FeedEntry[]) => (
    <ul className="feed-masonry">
      {list.map((entry) => (
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
  );
  const today = byDay("hoy").sort(newestFirst);
  // Lo de antes de hoy, en tarjetas (sin el resumen por disco de "esta semana")
  const older = entries.filter((e) => dayOf(e.note.createdAt) !== "hoy");

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
    <div className={`feed-layout feed-v2${hasPanel ? " has-panel" : ""}`}>
      <div className="feed-main">
        {error && <p className="error">{error}</p>}

        <LiveNow listening={listening} onNote={noteLive} onEnded={() => setTimeout(loadListening, 1500)} />

        <div className="composer-box">
          {me?.avatarUrl ? (
            <img className="note-avatar" style={{ width: 32, height: 32, flex: "none" }} src={me.avatarUrl} alt="" />
          ) : (
            <span className="note-avatar avatar-placeholder" style={{ width: 32, height: 32, flex: "none" }}>
              {me?.displayName[0]?.toUpperCase() ?? "♪"}
            </span>
          )}
          <textarea
            className="composer-textarea"
            rows={3}
            placeholder="¿Qué te ha llegado hoy? Escribe tu nota…"
            value={composerText}
            onChange={(e) => updateComposerText(e.target.value)}
          />
          <button className="btn btn-quiet btn-sm" onClick={goFinishInNotes} title="Vincular canción o grupo">
            🎵 Vincular canción
          </button>
          <button className="btn btn-primary btn-sm" disabled={!composerText.trim()} onClick={goFinishInNotes}>
            Publicar
          </button>
        </div>

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
          <>
            {today.length > 0 && (
              <>
                <div className="day-sep"><span>HOY</span></div>
                {cards(today)}
              </>
            )}
            {older.length > 0 && (
              <>
                {today.length > 0 && <div className="day-sep is-past"><span>ANTES</span></div>}
                {cards(older)}
              </>
            )}
          </>
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

        </aside>
      )}
    </div>
    </>
  );
}
