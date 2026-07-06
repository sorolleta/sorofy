import type { TopArtist, TopTrack } from "../types";

export default function TopsPanel({ artists, tracks }: { artists: TopArtist[]; tracks: TopTrack[] }) {
  return (
    <div className="top-cols">
      <div className="top-list">
        <h3>Top artistas · este mes</h3>
        {artists.length === 0 && <p className="section-sub">Nada por aquí todavía.</p>}
        {artists.map((a) => (
          <div key={a.spotifyArtistId} className="top-item">
            <span className="rank">{a.rank}</span>
            {a.name}
          </div>
        ))}
      </div>
      <div className="top-list">
        <h3>Top canciones · este mes</h3>
        {tracks.length === 0 && <p className="section-sub">Nada por aquí todavía.</p>}
        {tracks.map((t) => (
          <div key={t.spotifyTrackId} className="top-item">
            <span className="rank">{t.rank}</span>
            <span>
              {t.name} <small>— {t.artistName}</small>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
