import { Fragment, useState } from "react";
import { api, getMyUserId } from "../api";
import type { CommentThread, NoteCommentData, NoteInteractions } from "../types";

interface Props {
  noteId: string;
  interactions: NoteInteractions;
}

// Estado de lector de todas las notas de una pantalla en una sola llamada
export async function loadInteractions(noteIds: string[]): Promise<Map<string, NoteInteractions>> {
  if (noteIds.length === 0) return new Map();
  const list = await api.get<NoteInteractions[]>(
    `/api/notes/interactions?ids=${noteIds.join(",")}`,
  );
  return new Map(list.map((i) => [i.noteId, i]));
}

// "Le llega a Silvia", "...a Silvia y Marcos", "...a Silvia y 2 más"
function formatLikedBy(names: string[]): string {
  if (names.length === 1) return `Le llega a ${names[0]}`;
  if (names.length === 2) return `Le llega a ${names[0]} y ${names[1]}`;
  return `Le llega a ${names[0]} y ${names.length - 1} más`;
}

// La fila de "me llega" y comentarios de una tarjeta. Política del
// manifiesto: sin contadores públicos — el corazón solo guarda tu gesto,
// los nombres solo los ve el autor y de la conversación solo se señala
// que existe.
export default function NoteInteractionsBar({ noteId, interactions }: Props) {
  const isMine = interactions.likedBy !== null;
  const [liked, setLiked] = useState(interactions.likedByMe);
  const [open, setOpen] = useState(false);
  const [thread, setThread] = useState<CommentThread[] | null>(null);
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<CommentThread | null>(null);
  const [error, setError] = useState("");

  const toggleLike = async () => {
    setError("");
    const next = !liked;
    setLiked(next); // optimista: el gesto responde al instante
    try {
      await (next
        ? api.post(`/api/notes/${noteId}/like`)
        : api.delete(`/api/notes/${noteId}/like`));
    } catch (e) {
      setLiked(!next);
      setError(e instanceof Error ? e.message : "No se pudo guardar");
    }
  };

  const loadThread = () =>
    api.get<CommentThread[]>(`/api/notes/${noteId}/comments`).then(setThread);

  const toggleComments = () => {
    setOpen(!open);
    setError("");
    if (!open && thread === null) loadThread().catch(() => setError("No se pudo cargar el hilo"));
  };

  const send = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setError("");
    try {
      // La API devuelve el hilo entero ya recolocado
      const updated = await api.post<CommentThread[]>(`/api/notes/${noteId}/comments`, {
        text: trimmed,
        parentCommentId: replyTo?.root.id ?? null,
      });
      setThread(updated);
      setText("");
      setReplyTo(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo comentar");
    }
  };

  const removeComment = async (comment: NoteCommentData) => {
    setError("");
    try {
      await api.delete(`/api/notes/comments/${comment.id}`);
      await loadThread();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo borrar");
    }
  };

  const toggleCommentLike = async (comment: NoteCommentData) => {
    setError("");
    try {
      await (comment.likedByMe
        ? api.delete(`/api/notes/comments/${comment.id}/like`)
        : api.post(`/api/notes/comments/${comment.id}/like`));
      await loadThread();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar");
    }
  };

  const myId = getMyUserId();

  const renderComment = (comment: NoteCommentData, root?: CommentThread) => (
    <li key={comment.id} className={root ? "comment comment-reply" : "comment"}>
      <p className="comment-text">
        <strong>{comment.author.displayName}</strong> {comment.text}
      </p>
      <p className="comment-meta muted">
        {new Date(comment.createdAt).toLocaleDateString()}
        {comment.author.id === myId ? (
          <>
            {/* El recuento es privado: solo lo ves en lo tuyo */}
            {(comment.likeCount ?? 0) > 0 && (
              <span className="comment-llega">♥ Le llega a {comment.likeCount}</span>
            )}
            <button className="btn-link" onClick={() => removeComment(comment)}>
              Borrar
            </button>
          </>
        ) : (
          <button className="btn-link" onClick={() => toggleCommentLike(comment)}>
            {comment.likedByMe ? "♥ Te llega" : "♡ Me llega"}
          </button>
        )}
        <button className="btn-link" onClick={() => setReplyTo(root ?? { root: comment, replies: [] })}>
          Responder
        </button>
      </p>
    </li>
  );

  return (
    <div className="interactions">
      <p className="interactions-bar">
        {!isMine && (
          <button className={liked ? "btn-link liked" : "btn-link"} onClick={toggleLike}>
            {liked ? "♥ Te llega" : "♡ Me llega"}
          </button>
        )}
        <button className="btn-link" onClick={toggleComments}>
          {interactions.hasComments || (thread !== null && thread.length > 0)
            ? "💬 Ver conversación"
            : "💬 Comentar"}
        </button>
        {isMine && interactions.likedBy!.length > 0 && (
          <span className="note-llega">♥ {formatLikedBy(interactions.likedBy!)}</span>
        )}
      </p>

      {open && (
        <div className="comments-panel">
          {thread === null ? (
            <p className="muted">Cargando…</p>
          ) : (
            <ul className="comment-list">
              {thread.map((t) => (
                <Fragment key={t.root.id}>
                  {renderComment(t.root)}
                  {t.replies.map((reply) => renderComment(reply, t))}
                </Fragment>
              ))}
            </ul>
          )}
          {replyTo && (
            <p className="muted comment-replying">
              Respondiendo a {replyTo.root.author.displayName}{" "}
              <button className="btn-link" onClick={() => setReplyTo(null)}>
                Cancelar
              </button>
            </p>
          )}
          <div className="comment-form">
            <input
              value={text}
              maxLength={1000}
              placeholder={replyTo ? "Tu respuesta…" : "Añade algo a la conversación…"}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
            />
            <button className="btn btn-sm" disabled={!text.trim()} onClick={send}>
              Enviar
            </button>
          </div>
        </div>
      )}
      {error && <p className="error">{error}</p>}
    </div>
  );
}
