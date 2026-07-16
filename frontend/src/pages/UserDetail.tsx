import { Fragment, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api";
import type { UserProfile, Affinity, Note } from "../types";
import TopsPanel from "../components/TopsPanel";
import NoteList from "../components/NoteList";

// "Crumb, Men I Trust y Sílvia Pérez Cruz" — nombres en claro, separadores en gris
function BoldList({ names }: { names: string[] }) {
  return (
    <>
      {names.map((name, i) => (
        <Fragment key={name}>
          {i > 0 && (i === names.length - 1 ? " y " : ", ")}
          <strong className="common-name">{name}</strong>
        </Fragment>
      ))}
    </>
  );
}

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
      <header className="profile-head">
        {profile.avatarUrl ? (
          <img className="profile-avatar" src={profile.avatarUrl} alt="" />
        ) : (
          <span className="profile-avatar avatar-placeholder">
            {profile.displayName[0]?.toUpperCase() ?? "♪"}
          </span>
        )}
        <div>
          <h1 className="profile-name">{profile.displayName}</h1>
          <p className="profile-sub">
            {profile.province ? `${profile.province} · ` : ""}
            {profile.followersCount}{" "}
            {profile.followersCount === 1 ? "seguidor" : "seguidores"} · sigue a{" "}
            {profile.followingCount}
          </p>
        </div>
        <div className="profile-actions">
          <button
            className={`btn btn-ghost btn-sm btn-follow${profile.isFollowedByMe ? " is-following" : ""}`}
            onClick={toggleFollow}
          >
            {profile.isFollowedByMe ? "Siguiendo" : "Seguir"}
          </button>
          <Link className="btn btn-quiet btn-sm" to={`/chats/${profile.id}`}>
            Enviar mensaje
          </Link>
        </div>
      </header>

      {/* El contador de confianza sustituye al % de afinidad en el UI:
          la afinidad sigue viva como señal interna del feed */}
      {profile.trustCount > 0 && (
        <div className="trust-box">
          <span className="trust-num">{profile.trustCount}</span>
          <span className="trust-label">
            {profile.trustCount === 1 ? "canción guardada" : "canciones guardadas"} gracias a sus
            notas. Es la única métrica que verás aquí.
          </span>
        </div>
      )}

      {affinity && (affinity.commonArtists.length > 0 || affinity.commonTracks.length > 0) && (
        <div className="panel common-panel">
          <h2 className="section-title common-title">En común</h2>
          <p className="section-sub">
            {affinity.commonArtists.length > 0 && (
              <>
                Escucháis a <BoldList names={affinity.commonArtists} />.{" "}
              </>
            )}
            {affinity.commonTracks.length > 0 && (
              <>
                Compartís <BoldList names={affinity.commonTracks} />.
              </>
            )}
          </p>
        </div>
      )}

      <TopsPanel artists={profile.topArtists} tracks={profile.topTracks} />

      <div className="page-head">
        <h2 className="section-title">Su bitácora</h2>
      </div>
      <NoteList notes={notes} />
    </>
  );
}
