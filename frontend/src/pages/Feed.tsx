import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import type { FeedItem } from "../types";

export default function Feed() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  const load = () => {
    api.get<FeedItem[]>("/api/feed").then((f) => {
      setItems(f);
      setLoaded(true);
    });
  };

  // El feed se refresca solo cada 30 segundos, como quien mira qué suena
  useEffect(() => {
    load();
    const interval = setInterval(load, 30_000);
    return () => clearInterval(interval);
  }, []);

  if (!loaded) return <p>Cargando…</p>;
  if (items.length === 0) {
    return (
      <p className="muted">
        Tu feed está vacío. <Link to="/gente">Sigue a alguien</Link> para ver qué escucha.
      </p>
    );
  }

  return (
    <>
      <h1>Feed</h1>
      <ul className="user-list">
        {items.map((item) => (
          <li key={item.userId} className="user-card">
            {item.avatarUrl ? (
              <img className="avatar avatar-sm" src={item.avatarUrl} alt="" />
            ) : (
              <div className="avatar avatar-sm avatar-placeholder">♪</div>
            )}
            <div>
              <Link to={`/gente/${item.userId}`}>{item.displayName}</Link>
              {item.nowPlaying ? (
                <p className="now-playing">
                  ♪ <strong>{item.nowPlaying.track}</strong> — {item.nowPlaying.artist}
                </p>
              ) : (
                <p className="muted">No está escuchando nada ahora</p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
