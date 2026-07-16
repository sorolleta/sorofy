import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import type { UserSummary } from "../types";

export default function People() {
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    api.get<UserSummary[]>("/api/users").then((u) => {
      setUsers(u);
      setLoaded(true);
    });
  }, []);

  const toggleFollow = async (user: UserSummary) => {
    if (user.isFollowedByMe) {
      await api.delete(`/api/users/${user.id}/follow`).catch(() => {});
    } else {
      await api.post(`/api/users/${user.id}/follow`).catch(() => {});
    }
    setUsers((prev) =>
      prev.map((u) => (u.id === user.id ? { ...u, isFollowedByMe: !u.isFollowedByMe } : u)),
    );
  };

  if (!loaded) {
    return (
      <div className="loading-state">
        <span className="spinner" />
        Cargando…
      </div>
    );
  }
  if (users.length === 0) {
    return <p className="empty-state">Todavía no hay más gente por aquí.</p>;
  }

  return (
    <>
      <div className="page-head">
        <h1 className="section-title">Gente</h1>
        <p className="section-sub">
          Personas que escuchan como tú. Sin números públicos: solo sus notas
          hablan por ellas.
        </p>
      </div>
      <div className="panel people-panel">
        {users.map((user) => (
          <div key={user.id} className="person-row">
            {user.avatarUrl ? (
              <img className="person-avatar" src={user.avatarUrl} alt="" />
            ) : (
              <span className="person-avatar avatar-placeholder">
                {user.displayName[0]?.toUpperCase() ?? "♪"}
              </span>
            )}
            <Link to={`/gente/${user.id}`} className="person-name">
              {user.displayName}
              {user.province && <small>De {user.province}</small>}
            </Link>
            <button
              className={`btn btn-ghost btn-sm btn-follow${user.isFollowedByMe ? " is-following" : ""}`}
              onClick={() => toggleFollow(user)}
            >
              {user.isFollowedByMe ? "Siguiendo" : "Seguir"}
            </button>
          </div>
        ))}
      </div>
    </>
  );
}
