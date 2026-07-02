import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { HubConnection } from "@microsoft/signalr";
import { api, getMyUserId } from "../api";
import { createChatConnection } from "../chat";
import type { ChatMessage, UserProfile } from "../types";

export default function ChatThread() {
  const { id } = useParams();
  const myId = getMyUserId();
  const [partner, setPartner] = useState<UserProfile | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [connected, setConnected] = useState(false);
  const connectionRef = useRef<HubConnection | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    api.get<UserProfile>(`/api/users/${id}`).then(setPartner).catch(() => setError("Este usuario no existe"));
    api.get<ChatMessage[]>(`/api/chats/${id}`).then(setMessages).catch(() => {});

    // Conexión en vivo mientras el chat está abierto. El flag "active"
    // evita que una conexión ya desechada (React monta el efecto dos veces
    // en desarrollo) pise el estado de la conexión buena.
    let active = true;
    const connection = createChatConnection();
    connectionRef.current = connection;

    connection.on("messageReceived", (message: ChatMessage) => {
      // Solo pintamos lo que pertenece a esta conversación
      if (message.senderId === id || message.recipientId === id) {
        setMessages((prev) => [...prev, message]);
      }
    });
    connection.onreconnecting(() => setConnected(false));
    connection.onreconnected(() => setConnected(true));

    connection
      .start()
      .then(() => {
        if (active) setConnected(true);
      })
      .catch(() => {
        if (active) setError("No se pudo conectar al chat");
      });

    return () => {
      active = false;
      connection.stop();
    };
  }, [id]);

  // Al llegar mensajes, bajamos al final de la conversación
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || !connectionRef.current) return;
    setError("");
    try {
      await connectionRef.current.invoke("SendMessage", id, trimmed);
      setText("");
    } catch {
      setError("No se pudo enviar el mensaje");
    }
  };

  if (error && !partner) return <p className="error">{error}</p>;

  return (
    <div className="chat">
      <header className="chat-header">
        <Link to="/chats">←</Link>
        {partner?.avatarUrl ? (
          <img className="avatar avatar-sm" src={partner.avatarUrl} alt="" />
        ) : (
          <div className="avatar avatar-sm avatar-placeholder">♪</div>
        )}
        <strong>{partner?.displayName ?? "…"}</strong>
        {!connected && <span className="muted">conectando…</span>}
      </header>

      <div className="chat-messages">
        {messages.length === 0 && (
          <p className="muted">Aún no hay mensajes. ¡Rompe el hielo!</p>
        )}
        {messages.map((message) => (
          <div
            key={message.id}
            className={message.senderId === myId ? "bubble bubble-mine" : "bubble"}
          >
            <p>{message.text}</p>
            <span className="bubble-time">
              {new Date(message.sentAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form className="chat-input" onSubmit={send}>
        <input
          type="text"
          placeholder="Escribe un mensaje…"
          maxLength={1000}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button className="btn" type="submit" disabled={!connected || !text.trim()}>
          Enviar
        </button>
      </form>
      {error && partner && <p className="error">{error}</p>}
    </div>
  );
}
