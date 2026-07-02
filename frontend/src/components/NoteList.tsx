import type { Note, MusicItem } from "../types";

interface Props {
  notes: Note[];
  // Solo la página de notas pasa estos handlers; en los perfiles es de solo lectura
  onEdit?: (note: Note) => void;
  onDelete?: (note: Note) => void;
}

const TYPE_LABEL: Record<MusicItem["type"], string> = {
  album: "álbum",
  track: "canción",
  artist: "artista",
  localGroup: "grupo local",
};

// La tarjeta destaca el motivo humano (texto o vibe) y deja el formato
// en pequeño: esto es una bitácora, no un tablón de reseñas
export default function NoteList({ notes, onEdit, onDelete }: Props) {
  if (notes.length === 0) {
    return <p className="muted">Todavía no hay notas.</p>;
  }

  return (
    <ul className="note-list">
      {notes.map((note) => (
        <li key={note.id} className="note-card">
          {note.item.imageUrl ? (
            <img className="cover" src={note.item.imageUrl} alt="" />
          ) : (
            <div className="cover cover-placeholder">♪</div>
          )}
          <div className="note-body">
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
          {(onEdit || onDelete) && (
            <div className="note-actions">
              {onEdit && (
                <button className="btn-link" onClick={() => onEdit(note)}>
                  Editar
                </button>
              )}
              {onDelete && (
                <button className="btn-link" onClick={() => onDelete(note)}>
                  Borrar
                </button>
              )}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
