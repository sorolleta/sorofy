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

  if (!loaded) return <p>Cargando…</p>;
  if (users.length === 0) return <p className="muted">Todavía no hay más gente por aquí.</p>;

  return (
    <>
      <h1>Gente</h1>
      <ul className="user-list">
        {users.map((user) => (
          <li key={user.id} className="user-card">
            {user.avatarUrl ? (
              <img className="avatar avatar-sm" src={user.avatarUrl} alt="" />
            ) : (
              <div className="avatar avatar-sm avatar-placeholder">♪</div>
            )}
            <Link to={`/gente/${user.id}`}>{user.displayName}</Link>
            <button className="btn btn-sm" onClick={() => toggleFollow(user)}>
              {user.isFollowedByMe ? "Dejar de seguir" : "Seguir"}
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}
