import { Fragment, useEffect, useRef, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import type { HubConnection } from "@microsoft/signalr";
import { api, getMyUserId } from "../api";
import { createChatConnection } from "../chat";
import type { ChatMessage, Conversation, RutaCard, RutaDetail, UserProfile } from "../types";
import { RutaBubble } from "../components/RutaCards";

// Una ruta compartida viaja como enlace dentro del mensaje: …/rutas/{id}
const RUTA_LINK = /https?:\/\/\S*\/rutas\/([0-9a-f-]{36})\S*/i;

export default function ChatThread() {
  const { id } = useParams();
  const myId = getMyUserId();
  const [partner, setPartner] = useState<UserProfile | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  // Las demás conversaciones, para saltar entre ellas sin volver atrás
  const [conversations, setConversations] = useState<Conversation[]>([]);
  // "Escuchar con…" desde el directo del feed trae el mensaje ya escrito
  const location = useLocation();
  const [text, setText] = useState(() => (location.state as { prefill?: string } | null)?.prefill ?? "");
  const [error, setError] = useState("");
  const [connected, setConnected] = useState(false);
  // Tarjetas de las rutas compartidas en esta conversación (id → tarjeta)
  const [rutaCards, setRutaCards] = useState<Map<string, RutaCard | null>>(new Map());
  useEffect(() => {
    const ids = [...new Set(messages.map((m) => RUTA_LINK.exec(m.text)?.[1]).filter((x): x is string => !!x))];
    const missing = ids.filter((rid) => !rutaCards.has(rid));
    if (missing.length === 0) return;
    Promise.all(
      missing.map((rid) =>
        api.get<RutaDetail>(`/api/rutas/${rid}`).then((d) => [rid, d.card] as const).catch(() => [rid, null] as const),
      ),
    ).then((found) => setRutaCards((prev) => new Map([...prev, ...found])));
    // rutaCards solo se consulta para no repetir peticiones
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);
  const connectionRef = useRef<HubConnection | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    api.get<Conversation[]>("/api/chats").then(setConversations).catch(() => {});
  }, [id]);

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
    <div className="chats-layout">
      {conversations.length > 0 && (
        <div className="panel chats-list">
          {conversations.map((c) => (
            <Link
              key={c.userId}
              to={`/chats/${c.userId}`}
              className={`chat-row${c.userId === id ? " is-current" : ""}${c.hasUnread ? " chat-row-unread" : ""}`}
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
            </Link>
          ))}
        </div>
      )}

      <div className="panel chat">
      <header className="chat-header">
        <Link to="/chats" className="back-link">←</Link>
        {partner?.avatarUrl ? (
          <img className="note-avatar" src={partner.avatarUrl} alt="" />
        ) : (
          <span className="note-avatar avatar-placeholder">
            {partner?.displayName[0]?.toUpperCase() ?? "♪"}
          </span>
        )}
        <strong>{partner?.displayName ?? "…"}</strong>
        {!connected && <span className="muted">conectando…</span>}
      </header>

      <div className="chat-messages bubbles">
        {messages.length === 0 && (
          <p className="empty-state">Aún no hay mensajes. ¡Rompe el hielo!</p>
        )}
        {messages.map((message) => {
          const rutaId = RUTA_LINK.exec(message.text)?.[1];
          const card = rutaId ? rutaCards.get(rutaId) : undefined;
          const text = card ? message.text.replace(RUTA_LINK, "").trim() : message.text;
          return (
          <Fragment key={message.id}>
          {text && (
          <div
            className={message.senderId === myId ? "bubble bubble-mine" : "bubble bubble-theirs"}
          >
            <p>{text}</p>
            <span className="bubble-time">
              {new Date(message.sentAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
          )}
          {card && <RutaBubble card={card} mine={message.senderId === myId} />}
          </Fragment>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form className="chat-input-row" onSubmit={send}>
        <input
          type="text"
          placeholder="Escribe un mensaje…"
          maxLength={1000}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button
          className="chat-send"
          type="submit"
          aria-label="Enviar"
          disabled={!connected || !text.trim()}
        >
          ↑
        </button>
      </form>
      {error && partner && <p className="error">{error}</p>}
      </div>
    </div>
  );
}
