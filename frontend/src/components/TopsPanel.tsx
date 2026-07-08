import type { TopArtist, TopTrack } from "../types";

function Cover({ url, round }: { url: string | null; round?: boolean }) {
  if (url) return <img className={round ? "cover round" : "cover"} src={url} alt="" />;
  return <span className={`cover cover-placeholder${round ? " round" : ""}`}>♪</span>;
}

export default function TopsPanel({ artists, tracks }: { artists: TopArtist[]; tracks: TopTrack[] }) {
  return (
    <div className="top-cols">
      <div className="top-list">
        <h3>Top artistas · este mes</h3>
        {artists.length === 0 && <p className="section-sub">Nada por aquí todavía.</p>}
        {artists.map((a) => (
          <div key={a.spotifyArtistId} className="top-row">
            <span className="rank">{a.rank}</span>
            <Cover url={a.imageUrl} round />
            <span className="result-name">{a.name}</span>
          </div>
        ))}
      </div>
      <div className="top-list">
        <h3>Top canciones · este mes</h3>
        {tracks.length === 0 && <p className="section-sub">Nada por aquí todavía.</p>}
        {tracks.map((t) => (
          <div key={t.spotifyTrackId} className="top-row">
            <span className="rank">{t.rank}</span>
            <Cover url={t.imageUrl} />
            <span className="result-name">
              {t.name} <small>— {t.artistName}</small>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
