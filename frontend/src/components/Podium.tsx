import type { TopArtist, TopTrack } from "../types";

// Un puesto del podio: carátula (redonda para artistas), plaza y nombre
interface Step {
  key: string;
  name: string;
  imageUrl: string | null;
  round?: boolean;
}

// El podio se pinta 2-1-3: el primero en medio y más grande
function PodiumPanel({ title, steps }: { title: string; steps: Step[] }) {
  const order = [steps[1], steps[0], steps[2]];
  return (
    <div className="podium-panel">
      <h3>{title}</h3>
      <div className="podium">
        {order.map((step, i) => {
          const place = i === 1 ? 1 : i === 0 ? 2 : 3;
          return (
            <div key={step.key} className={place === 1 ? "podium-step first" : "podium-step"}>
              {step.imageUrl ? (
                <img className={step.round ? "cover round" : "cover"} src={step.imageUrl} alt="" />
              ) : (
                <span className={`cover cover-placeholder${step.round ? " round" : ""}`}>♪</span>
              )}
              <span className="podium-place">{place}</span>
              <span className="podium-name">{step.name}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Los álbumes no existen como top en Spotify: se derivan de las canciones
// del top agrupadas por álbum (más canciones = más querido; empate lo
// decide la canción mejor colocada)
function topAlbums(tracks: TopTrack[]): Step[] {
  const byAlbum = new Map<string, { name: string; imageUrl: string | null; count: number; bestRank: number }>();
  for (const t of tracks) {
    const key = t.albumSpotifyId ?? t.albumName;
    if (!key) continue;
    const entry = byAlbum.get(key);
    if (entry) {
      entry.count += 1;
      entry.bestRank = Math.min(entry.bestRank, t.rank);
    } else {
      byAlbum.set(key, { name: t.albumName ?? t.name, imageUrl: t.imageUrl, count: 1, bestRank: t.rank });
    }
  }
  return [...byAlbum.entries()]
    .sort(([, a], [, b]) => b.count - a.count || a.bestRank - b.bestRank)
    .slice(0, 3)
    .map(([key, a]) => ({ key, name: a.name, imageUrl: a.imageUrl }));
}

export default function Podium({ artists, tracks }: { artists: TopArtist[]; tracks: TopTrack[] }) {
  const albums = topAlbums(tracks);
  const topArtists: Step[] = artists
    .slice(0, 3)
    .map((a) => ({ key: a.spotifyArtistId, name: a.name, imageUrl: a.imageUrl, round: true }));
  const topSongs: Step[] = tracks
    .slice(0, 3)
    .map((t) => ({ key: t.spotifyTrackId, name: t.name, imageUrl: t.imageUrl }));

  // Sin tres puestos no hay podio; sin ningún panel, ni sección
  const panels = [
    { title: "Álbumes", steps: albums },
    { title: "Artistas", steps: topArtists },
    { title: "Canciones", steps: topSongs },
  ].filter((p) => p.steps.length === 3);

  if (panels.length === 0) return null;

  return (
    <>
      <div className="shelf-head">
        <h2 className="section-title">Tus tres más queridos</h2>
        <span className="note-track-date">según tus escuchas — sin cifras</span>
      </div>
      <div className="podium-wrap">
        {panels.map((p) => (
          <PodiumPanel key={p.title} title={p.title} steps={p.steps} />
        ))}
      </div>
    </>
  );
}
