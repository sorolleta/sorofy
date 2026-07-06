import { useEffect, useState } from "react";
import type { Note, NoteInteractions } from "../types";
import NoteCard from "./NoteCard";
import { loadInteractions } from "./NoteInteractionsBar";

interface Props {
  notes: Note[];
  // Solo la página de notas pasa estos handlers; en los perfiles es de solo lectura
  onEdit?: (note: Note) => void;
  onDelete?: (note: Note) => void;
  // La nota cuyo "Borrar" espera el segundo clic de confirmación
  confirmingDelete?: string | null;
}

export default function NoteList({ notes, onEdit, onDelete, confirmingDelete }: Props) {
  const [interactions, setInteractions] = useState<Map<string, NoteInteractions>>(new Map());

  // El estado de lector se pide en lote para toda la lista (y se repide
  // si cambian las notas, p. ej. al crear una desde el formulario)
  const ids = notes.map((n) => n.id).join(",");
  useEffect(() => {
    loadInteractions(ids ? ids.split(",") : []).then(setInteractions).catch(() => {});
  }, [ids]);

  if (notes.length === 0) {
    return <p className="empty-state">Todavía no hay notas.</p>;
  }

  return (
    <ul className="note-list">
      {notes.map((note) => (
        <NoteCard
          key={note.id}
          note={note}
          interactions={interactions.get(note.id)}
          actions={
            (onEdit || onDelete) && (
              <>
                {onEdit && (
                  <button className="btn btn-quiet btn-sm" onClick={() => onEdit(note)}>
                    Editar
                  </button>
                )}
                {onDelete && (
                  <button
                    className={`btn btn-danger-quiet btn-sm${
                      confirmingDelete === note.id ? " is-arming" : ""
                    }`}
                    onClick={() => onDelete(note)}
                  >
                    {confirmingDelete === note.id ? "¿Seguro? Borrar" : "Borrar"}
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
