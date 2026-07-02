import { useEffect, useState } from "react";
import { api } from "../api";
import type { MyProfile, NowPlaying } from "../types";
import TopsPanel from "../components/TopsPanel";

export default function Profile() {
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [nowPlaying, setNowPlaying] = useState<NowPlaying | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");

  const load = () => {
    api.get<MyProfile>("/api/me").then(setProfile).catch(() => setError("No se pudo cargar el perfil"));
    api.get<NowPlaying>("/api/me/now-playing").then(setNowPlaying).catch(() => {});
  };

  useEffect(load, []);

  const sync = async () => {
    setSyncing(true);
    try {
      await api.post("/api/me/sync");
      load();
    } catch {
      setError("No se pudo sincronizar con Spotify");
    } finally {
      setSyncing(false);
    }
  };

  if (error) return <p className="error">{error}</p>;
  if (!profile) return <p>Cargando…</p>;

  return (
    <>
      <header className="profile-header">
        {profile.avatarUrl && <img className="avatar" src={profile.avatarUrl} alt="" />}
        <div>
          <h1>{profile.displayName}</h1>
          {nowPlaying?.playing && (
            <p className="now-playing">
              ♪ Escuchando ahora: <strong>{nowPlaying.track}</strong> — {nowPlaying.artist}
            </p>
          )}
          <p className="muted">
            {profile.lastSync
              ? `Última sincronización: ${new Date(profile.lastSync).toLocaleString()}`
              : "Aún no has importado tu música."}
          </p>
          <button className="btn" onClick={sync} disabled={syncing}>
            {syncing ? "Sincronizando…" : "Sincronizar con Spotify"}
          </button>
        </div>
      </header>
      <TopsPanel artists={profile.topArtists} tracks={profile.topTracks} />
    </>
  );
}
