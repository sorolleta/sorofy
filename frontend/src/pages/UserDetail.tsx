import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api";
import type { UserProfile, Affinity, Note } from "../types";
import TopsPanel from "../components/TopsPanel";
import NoteList from "../components/NoteList";

export default function UserDetail() {
  const { id } = useParams();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [affinity, setAffinity] = useState<Affinity | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [error, setError] = useState("");

  const load = () => {
    api.get<UserProfile>(`/api/users/${id}`).then(setProfile).catch(() => setError("Este perfil no existe o no se pudo cargar"));
    api.get<Affinity>(`/api/users/${id}/affinity`).then(setAffinity).catch(() => {});
    api.get<Note[]>(`/api/users/${id}/notes`).then(setNotes).catch(() => {});
  };

  useEffect(load, [id]);

  const toggleFollow = async () => {
    if (!profile) return;
    if (profile.isFollowedByMe) {
      await api.delete(`/api/users/${profile.id}/follow`);
    } else {
      await api.post(`/api/users/${profile.id}/follow`);
    }
    load();
  };

  if (error) return <p className="error">{error}</p>;
  if (!profile) return <p>Cargando…</p>;

  return (
    <>
      <header className="profile-header">
        {profile.avatarUrl && <img className="avatar" src={profile.avatarUrl} alt="" />}
        <div>
          <h1>{profile.displayName}</h1>
          <p className="muted">
            {profile.followers} seguidores · sigue a {profile.following}
          </p>
          <div className="profile-actions">
            <button className="btn" onClick={toggleFollow}>
              {profile.isFollowedByMe ? "Dejar de seguir" : "Seguir"}
            </button>
            <Link className="btn btn-outline" to={`/chats/${profile.id}`}>
              Enviar mensaje
            </Link>
          </div>
        </div>
        {/* El contador de confianza sustituye al % de afinidad en el UI:
            la afinidad sigue viva como señal interna del feed */}
        {profile.trustCount > 0 && (
          <div className="affinity">
            <span className="affinity-score">{profile.trustCount}</span>
            <span className="muted">
              {profile.trustCount === 1 ? "canción guardada" : "canciones guardadas"}
              <br />
              gracias a sus notas
            </span>
          </div>
        )}
      </header>

      {affinity && (affinity.commonArtists.length > 0 || affinity.commonTracks.length > 0) && (
        <section className="common">
          <h2>En común</h2>
          {affinity.commonArtists.length > 0 && (
            <p>
              <strong>Artistas:</strong> {affinity.commonArtists.join(", ")}
            </p>
          )}
          {affinity.commonTracks.length > 0 && (
            <p>
              <strong>Canciones:</strong> {affinity.commonTracks.join(" · ")}
            </p>
          )}
        </section>
      )}

      <TopsPanel artists={profile.topArtists} tracks={profile.topTracks} />

      <section>
        <h2>Su bitácora</h2>
        <NoteList notes={notes} />
      </section>
    </>
  );
}
