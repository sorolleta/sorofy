import type { TopArtist, TopTrack } from "../types";

export default function TopsPanel({ artists, tracks }: { artists: TopArtist[]; tracks: TopTrack[] }) {
  return (
    <div className="tops">
      <section>
        <h2>Top artistas</h2>
        {artists.length === 0 && <p className="muted">Nada por aquí todavía.</p>}
        <ol>
          {artists.map((a) => (
            <li key={a.spotifyArtistId}>{a.name}</li>
          ))}
        </ol>
      </section>
      <section>
        <h2>Top canciones</h2>
        {tracks.length === 0 && <p className="muted">Nada por aquí todavía.</p>}
        <ol>
          {tracks.map((t) => (
            <li key={t.spotifyTrackId}>
              {t.name} <span className="muted">— {t.artistName}</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
