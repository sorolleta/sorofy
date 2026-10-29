import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import type { FeedItem, UserSummary } from "../types";
import { LiveEq } from "../components/LiveNow";

export default function People() {
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [loaded, setLoaded] = useState(false);
  // Quién de la gente que sigues está escuchando algo ahora (anillo lavanda)
  const [live, setLive] = useState<Map<string, FeedItem>>(new Map());

  useEffect(() => {
    api
      .get<FeedItem[]>("/api/feed/now-playing")
      .then((list) => setLive(new Map(list.filter((i) => i.nowPlaying).map((i) => [i.userId, i]))))
      .catch(() => {});
  }, []);

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
          hablan por ellas. El anillo lavanda indica quién está escuchando ahora.
        </p>
      </div>
      <div className="panel people-panel">
        {users.map((user) => (
          <div key={user.id} className="person-row">
            {user.avatarUrl ? (
              <img className={`person-avatar${live.has(user.id) ? " is-live" : ""}`} src={user.avatarUrl} alt="" />
            ) : (
              <span className={`person-avatar avatar-placeholder${live.has(user.id) ? " is-live" : ""}`}>
                {user.displayName[0]?.toUpperCase() ?? "♪"}
              </span>
            )}
            <Link to={`/gente/${user.id}`} className="person-name">
              {user.displayName}
              {user.province && <small>De {user.province}</small>}
              {live.get(user.id)?.nowPlaying && (
                <small className="live-line">
                  <LiveEq small />
                  <span>
                    {live.get(user.id)!.nowPlaying!.track} — {live.get(user.id)!.nowPlaying!.artist}
                  </span>
                </small>
              )}
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
