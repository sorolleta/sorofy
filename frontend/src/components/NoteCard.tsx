import { Link } from "react-router-dom";
import type { Note, MusicItem, NoteAuthor } from "../types";

interface Props {
  note: Note;
  // El feed muestra quién escribió la nota; la bitácora no lo necesita
  author?: NoteAuthor;
  actions?: React.ReactNode;
}

const TYPE_LABEL: Record<MusicItem["type"], string> = {
  album: "álbum",
  track: "canción",
  artist: "artista",
  localGroup: "grupo local",
};

// La tarjeta destaca el motivo humano (texto o vibe) y deja el formato
// en pequeño: esto es contexto, no un tablón de reseñas
export default function NoteCard({ note, author, actions }: Props) {
  return (
    <li className="note-card">
      {note.item.imageUrl ? (
        <img className="cover" src={note.item.imageUrl} alt="" />
      ) : (
        <div className="cover cover-placeholder">♪</div>
      )}
      <div className="note-body">
        {author && (
          <p className="note-author">
            {author.avatarUrl ? (
              <img className="avatar avatar-xs" src={author.avatarUrl} alt="" />
            ) : (
              <span className="avatar avatar-xs avatar-placeholder">♪</span>
            )}
            <Link to={`/gente/${author.id}`}>{author.displayName}</Link>
          </p>
        )}
        {note.text && <p className="note-text">{note.text}</p>}
        {note.vibeLabel && (
          <p>
            <span
              className="vibe-chip"
              style={note.vibeColor ? { background: note.vibeColor } : undefined}
            >
              {note.vibeEmoji && <span>{note.vibeEmoji} </span>}
              {note.vibeLabel}
            </span>
          </p>
        )}
        <p className="note-item muted">
          {note.item.name}
          {note.item.artistName && ` — ${note.item.artistName}`}
          <span className="badge">{TYPE_LABEL[note.item.type]}</span>
        </p>
        <p className="muted">
          {new Date(note.createdAt).toLocaleDateString()}
          {note.updatedAt && " · editada"}
        </p>
      </div>
      {actions && <div className="note-actions">{actions}</div>}
    </li>
  );
}
