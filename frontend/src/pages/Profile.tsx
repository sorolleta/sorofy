import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, getMyUserId, isGuest } from "../api";
import type { MyProfile, NowPlaying, Note, UserProfile } from "../types";
import { useNavigate } from "react-router-dom";
import TopsPanel from "../components/TopsPanel";
import Trio from "../components/Trio";
import NoteList from "../components/NoteList";

export default function Profile() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [nowPlaying, setNowPlaying] = useState<NowPlaying | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  // El contador de confianza sale del perfil público: cuántas canciones
  // guardó la gente gracias a tus notas
  const [trustCount, setTrustCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");

  const load = () => {
    api.get<MyProfile>("/api/me").then(setProfile).catch(() => setError("No se pudo cargar el perfil"));
    api.get<NowPlaying>("/api/me/now-playing").then(setNowPlaying).catch(() => {});
    api.get<Note[]>("/api/notes/mine").then(setNotes).catch(() => {});
    const myId = getMyUserId();
    if (myId) {
      api.get<UserProfile>(`/api/users/${myId}`).then((u) => setTrustCount(u.trustCount)).catch(() => {});
    }
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
  if (!profile) {
    return (
      <div className="loading-state">
        <span className="spinner" />
        Cargando…
      </div>
    );
  }

  return (
    <>
      <header className="profile-head profile-head-halo">
        {profile.avatarUrl ? (
          <img className="profile-avatar-xl" src={profile.avatarUrl} alt="" />
        ) : (
          <span className="profile-avatar-xl avatar-placeholder">
            {profile.displayName[0]?.toUpperCase() ?? "♪"}
          </span>
        )}
        <div>
          <h1 className="profile-name profile-name-xl">{profile.displayName}</h1>
          <p className="profile-sub">
            {profile.province ? `${profile.province} · ` : ""}
            en Sorofy desde{" "}
            {new Date(profile.createdAt).toLocaleDateString("es-ES", {
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
        {profile.tags.length > 0 && (
          <div className="profile-tags">
            {profile.tags.map((tag) => (
              <span key={tag} className="tag-chip tag-chip-static">
                {tag}
              </span>
            ))}
          </div>
        )}
        {nowPlaying?.playing && (
          <div className="now-playing quiet">
            <span className="dot" />♪ Sonando ahora · {nowPlaying.track} — {nowPlaying.artist}
          </div>
        )}
        <div className="profile-actions">
          {/* Los invitados no tienen Spotify del que traer sus tops */}
          {!isGuest(profile.spotifyId) && (
            <button className="btn btn-quiet btn-sm" onClick={sync} disabled={syncing}>
              {syncing ? "Sincronizando…" : "Sincronizar con Spotify"}
            </button>
          )}
          {/* El mismo onboarding sirve para editar: repetirlo reemplaza */}
          <button className="btn btn-quiet btn-sm" onClick={() => navigate("/onboarding")}>
            Editar perfil
          </button>
        </div>
      </header>

      {trustCount > 0 && (
        <div className="trust-box">
          <span className="trust-num">{trustCount}</span>
          <span className="trust-label">
            {trustCount === 1 ? "canción guardada" : "canciones guardadas"} por otros gracias a
            tus notas. Tu única métrica — y es un regalo.
          </span>
        </div>
      )}

      <Trio artists={profile.topArtists} tracks={profile.topTracks} />

      <div className="profile-section">
        <TopsPanel artists={profile.topArtists} tracks={profile.topTracks} />
      </div>

      <div className="profile-section">
        <div className="page-head">
          <h2 className="section-title">Mi bitácora</h2>
          <p className="section-sub">
            Lo que has ido anotando, sin presentarte a ti mismo — aquí ya sabes
            quién eres. Se escribe y edita desde{" "}
            <Link to="/notas" className="accent">Notas</Link>.
          </p>
        </div>
        <NoteList notes={notes} />
      </div>
    </>
  );
}
