import type { Note } from "../types";
import NoteCard from "./NoteCard";

interface Props {
  notes: Note[];
  // Solo la página de notas pasa estos handlers; en los perfiles es de solo lectura
  onEdit?: (note: Note) => void;
  onDelete?: (note: Note) => void;
}

export default function NoteList({ notes, onEdit, onDelete }: Props) {
  if (notes.length === 0) {
    return <p className="muted">Todavía no hay notas.</p>;
  }

  return (
    <ul className="note-list">
      {notes.map((note) => (
        <NoteCard
          key={note.id}
          note={note}
          actions={
            (onEdit || onDelete) && (
              <>
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
              </>
            )
          }
        />
      ))}
    </ul>
  );
}
