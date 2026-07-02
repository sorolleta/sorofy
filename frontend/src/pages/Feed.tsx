import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import type { FeedEntry, FeedItem } from "../types";
import NoteCard from "../components/NoteCard";

export default function Feed() {
  const [entries, setEntries] = useState<FeedEntry[]>([]);
  const [listening, setListening] = useState<FeedItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Las tarjetas se cargan una vez; la franja de "sonando ahora" se
  // refresca sola cada 30 segundos, como quien mira qué suena
  useEffect(() => {
    api.get<FeedEntry[]>("/api/feed").then((f) => {
      setEntries(f);
      setLoaded(true);
    });

    const loadListening = () =>
      api.get<FeedItem[]>("/api/feed/now-playing").then(setListening).catch(() => {});
    loadListening();
    const interval = setInterval(loadListening, 30_000);
    return () => clearInterval(interval);
  }, []);

  const nowListening = listening.filter((i) => i.nowPlaying !== null);

  if (!loaded) return <p>Cargando…</p>;

  return (
    <>
      <h1>Feed</h1>

      {nowListening.length > 0 && (
        <section className="listening-strip">
          {nowListening.map((item) => (
            <p key={item.userId} className="now-playing">
              ♪ <Link to={`/gente/${item.userId}`}>{item.displayName}</Link>:{" "}
              <strong>{item.nowPlaying!.track}</strong> — {item.nowPlaying!.artist}
            </p>
          ))}
        </section>
      )}

      {entries.length === 0 ? (
        <p className="muted">
          Aún no hay notas que descubrir. <Link to="/gente">Sigue a alguien</Link> o{" "}
          <Link to="/notas">escribe la primera</Link>.
        </p>
      ) : (
        <ul className="note-list">
          {entries.map((entry) => (
            <NoteCard key={entry.note.id} note={entry.note} author={entry.author} />
          ))}
        </ul>
      )}
    </>
  );
}
