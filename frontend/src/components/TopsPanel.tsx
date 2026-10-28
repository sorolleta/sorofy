import { useNavigate } from "react-router-dom";
import { api } from "../api";
import type { TopArtist, TopTrack } from "../types";

function Cover({ url, round }: { url: string | null; round?: boolean }) {
  if (url) return <img className={round ? "cover round" : "cover"} src={url} alt="" />;
  return <span className={`cover cover-placeholder${round ? " round" : ""}`}>♪</span>;
}

export default function TopsPanel({ artists, tracks }: { artists: TopArtist[]; tracks: TopTrack[] }) {
  const navigate = useNavigate();

  // Cada fila lleva a la ficha de su canción o artista (se crea si nadie la abrió antes)
  const open = (type: "track" | "artist", spotifyId: string) =>
    api
      .get<{ id: string }>(`/api/music-items/resolve?type=${type}&spotifyId=${spotifyId}`)
      .then((r) => navigate(`/musica/${r.id}`))
      .catch(() => {});

  return (
    <div className="top-cols">
      <div className="top-list">
        <h3>Top artistas · este mes</h3>
        {artists.length === 0 && <p className="section-sub">Nada por aquí todavía.</p>}
        {artists.map((a) => (
          <button key={a.spotifyArtistId} className="top-row" onClick={() => open("artist", a.spotifyArtistId)}>
            <span className="rank">{a.rank}</span>
            <Cover url={a.imageUrl} round />
            <span className="result-name">{a.name}</span>
          </button>
        ))}
      </div>
      <div className="top-list">
        <h3>Top canciones · este mes</h3>
        {tracks.length === 0 && <p className="section-sub">Nada por aquí todavía.</p>}
        {tracks.map((t) => (
          <button key={t.spotifyTrackId} className="top-row" onClick={() => open("track", t.spotifyTrackId)}>
            <span className="rank">{t.rank}</span>
            <Cover url={t.imageUrl} />
            <span className="result-name">
              {t.name} <small>— {t.artistName}</small>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
