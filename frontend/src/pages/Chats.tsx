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

  if (!loaded) {
    return (
      <div className="loading-state">
        <span className="spinner" />
        Cargando…
      </div>
    );
  }
  if (conversations.length === 0) {
    return (
      <p className="empty-state">
        No tienes conversaciones. Abre el perfil de alguien en{" "}
        <Link to="/gente" className="accent">Gente</Link> y mándale un mensaje.
      </p>
    );
  }

  return (
    <>
      <div className="page-head">
        <h1 className="section-title">Chats</h1>
      </div>
      <div className="panel people-panel">
        {conversations.map((c) => (
          <Link
            key={c.userId}
            to={`/chats/${c.userId}`}
            className={`chat-row${c.hasUnread ? " chat-row-unread" : ""}`}
          >
            {c.avatarUrl ? (
              <img className="person-avatar" src={c.avatarUrl} alt="" />
            ) : (
              <span className="person-avatar avatar-placeholder">
                {c.displayName[0]?.toUpperCase() ?? "♪"}
              </span>
            )}
            <span className="chat-preview">
              <strong>{c.displayName}</strong>
              <span>
                {c.lastMessage.fromMe && "Tú: "}
                {c.lastMessage.text}
              </span>
            </span>
            <span className="chat-time">
              {c.hasUnread && <span className="chat-unread-dot" aria-label="Sin leer" />}
              {new Date(c.lastMessage.sentAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </Link>
        ))}
      </div>
    </>
  );
}
