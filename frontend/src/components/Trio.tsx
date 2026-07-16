import { useNavigate } from "react-router-dom";
import { api } from "../api";
import type { TopArtist, TopTrack } from "../types";

// "Tus tres más queridos": un álbum, un artista y una canción con el mismo
// peso visual — sin podio ni ranking, fiel al manifiesto. Salen de tus
// escuchas: el artista y la canción número 1, y el álbum que más se repite
// en tu top (empate lo decide la canción mejor colocada).
interface Pick {
  kicker: string;
  name: string;
  sub: string | null;
  imageUrl: string | null;
  round?: boolean;
  spotify?: { type: string; id: string };
}

function favoriteAlbum(tracks: TopTrack[]): Pick | null {
  const byAlbum = new Map<
    string,
    { name: string; imageUrl: string | null; spotifyId: string | null; artistName: string; count: number; bestRank: number }
  >();
  for (const t of tracks) {
    const key = t.albumSpotifyId ?? t.albumName;
    if (!key) continue;
    const entry = byAlbum.get(key);
    if (entry) {
      entry.count += 1;
      entry.bestRank = Math.min(entry.bestRank, t.rank);
    } else {
      byAlbum.set(key, {
        name: t.albumName ?? t.name,
        imageUrl: t.imageUrl,
        spotifyId: t.albumSpotifyId,
        artistName: t.artistName,
        count: 1,
        bestRank: t.rank,
      });
    }
  }
  const best = [...byAlbum.values()]
    .sort((a, b) => b.count - a.count || a.bestRank - b.bestRank)[0];
  if (!best) return null;
  return {
    kicker: "álbum",
    name: best.name,
    sub: best.artistName,
    imageUrl: best.imageUrl,
    spotify: best.spotifyId ? { type: "album", id: best.spotifyId } : undefined,
  };
}

export default function Trio({ artists, tracks }: { artists: TopArtist[]; tracks: TopTrack[] }) {
  const navigate = useNavigate();

  const album = favoriteAlbum(tracks);
  const artist = artists[0];
  const track = tracks[0];

  const picks: Pick[] = [];
  if (album) picks.push(album);
  if (artist) {
    picks.push({
      kicker: "artista",
      name: artist.name,
      sub: null,
      imageUrl: artist.imageUrl,
      round: true,
      spotify: { type: "artist", id: artist.spotifyArtistId },
    });
  }
  if (track) {
    picks.push({
      kicker: "canción",
      name: track.name,
      sub: track.artistName,
      imageUrl: track.imageUrl,
      spotify: { type: "track", id: track.spotifyTrackId },
    });
  }

  if (picks.length === 0) return null;

  // De un id de Spotify a la ficha de nuestro MusicItem (find-or-create)
  const open = (pick: Pick) => {
    if (!pick.spotify) return;
    api
      .get<{ id: string }>(
        `/api/music-items/resolve?type=${pick.spotify.type}&spotifyId=${pick.spotify.id}`,
      )
      .then((r) => navigate(`/musica/${r.id}`))
      .catch(() => {});
  };

  return (
    <div className="profile-section">
      <div className="shelf-head">
        <h2 className="section-title">Tus tres más queridos</h2>
        <span className="note-track-date">según tus notas y escuchas — sin orden entre ellos</span>
      </div>
      <div className="trio-grid">
        {picks.map((pick) => (
          <div key={pick.kicker} className="podium-panel trio-card" onClick={() => open(pick)}>
            <span className="card-kicker">{pick.kicker}</span>
            {pick.imageUrl ? (
              <img
                className={`cover trio-cover${pick.round ? " round" : ""}`}
                src={pick.imageUrl}
                alt=""
              />
            ) : (
              <span className={`cover trio-cover cover-placeholder${pick.round ? " round" : ""}`}>
                ♪
              </span>
            )}
            <span className="podium-name trio-name">{pick.name}</span>
            {pick.sub && <span className="note-track-date">{pick.sub}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
