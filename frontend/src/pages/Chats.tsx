import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import type { Conversation } from "../types";

export default function Chats() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    api.get<Conversation[]>("/api/chats").then((c) => {
      setConversations(c);
      setLoaded(true);
    });
  }, []);

  if (!loaded) return <p>Cargando…</p>;
  if (conversations.length === 0) {
    return (
      <p className="muted">
        No tienes conversaciones. Abre el perfil de alguien en{" "}
        <Link to="/gente">Gente</Link> y mándale un mensaje.
      </p>
    );
  }

  return (
    <>
      <h1>Chats</h1>
      <ul className="user-list">
        {conversations.map((c) => (
          <li key={c.userId} className="user-card">
            {c.avatarUrl ? (
              <img className="avatar avatar-sm" src={c.avatarUrl} alt="" />
            ) : (
              <div className="avatar avatar-sm avatar-placeholder">♪</div>
            )}
            <div className="chat-preview">
              <Link to={`/chats/${c.userId}`}>{c.displayName}</Link>
              <p className="muted">
                {c.lastMessage.fromMe && "Tú: "}
                {c.lastMessage.text}
              </p>
            </div>
            <span className="muted chat-time">
              {new Date(c.lastMessage.sentAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </li>
        ))}
      </ul>
    </>
  );
}
