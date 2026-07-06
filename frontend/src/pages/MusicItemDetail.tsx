import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api";
import type { MusicItemDetail as Detail, NoteInteractions } from "../types";
import NoteCard from "../components/NoteCard";
import { loadInteractions } from "../components/NoteInteractionsBar";
import PlatformPlayer from "../components/PlatformPlayer";

const TYPE_LABEL: Record<string, string> = {
  album: "álbum",
  track: "canción",
  artist: "artista",
  localGroup: "grupo local",
};

// La ficha de un item: qué es y todo lo que la comunidad ha escrito sobre
// él. Sin nota media ni rankings a propósito: contexto en orden
// cronológico, fiel al manifiesto.
export default function MusicItemDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [interactions, setInteractions] = useState<Map<string, NoteInteractions>>(new Map());
  const [error, setError] = useState("");

  useEffect(() => {
    setDetail(null);
    setError("");
    api
      .get<Detail>(`/api/music-items/${id}`)
      .then((d) => {
        setDetail(d);
        loadInteractions(d.notes.map((n) => n.note.id)).then(setInteractions).catch(() => {});
      })
      .catch(() => setError("Este item no existe o no se pudo cargar"));
  }, [id]);

  if (error) return <p className="error">{error}</p>;
  if (!detail) {
    return (
      <div className="loading-state">
        <span className="spinner" />
        Cargando…
      </div>
    );
  }

  const { item, notes } = detail;

  // El formulario de notas vive en /notas; le pasamos el item ya elegido
  const writeNote = () =>
    navigate("/notas", {
      state: {
        noteDraft:
          item.type === "localGroup"
            ? { musicItemId: item.id, name: item.name }
            : {
                itemType: item.type,
                spotifyItemId: item.spotifyId,
                name: item.name,
                artistName: item.artistName,
              },
      },
    });

  return (
    <>
      <header className="album-head">
        {item.imageUrl ? (
          <img
            className={`album-cover-lg${item.type === "artist" ? " is-round" : ""}`}
            src={item.imageUrl}
            alt=""
          />
        ) : (
          <span className="album-cover-lg cover-placeholder">
            {item.type === "localGroup" ? "🎪" : "♪"}
          </span>
        )}
        <div className="album-head-info">
          <span className="card-kicker">
            {item.type === "localGroup"
              ? (item.category ?? TYPE_LABEL.localGroup).toLowerCase()
              : TYPE_LABEL[item.type]}
            {item.province && ` · ${item.province}`}
          </span>
          <h1 className="album-title">{item.name}</h1>
          {item.artistName && <p className="album-facts">{item.artistName}</p>}
          {item.description && <p className="section-sub">{item.description}</p>}
          <div className="profile-actions">
            <button className="btn btn-primary btn-sm" onClick={writeNote}>
              Escribir una nota
            </button>
          </div>
        </div>
      </header>

      <PlatformPlayer
        youtubeUrl={item.youtubeUrl}
        soundcloudUrl={item.soundcloudUrl}
        spotifyType={item.type}
        spotifyId={item.spotifyId}
        title={item.name}
      />

      <div className="page-head">
        <h2 className="section-title">Lo que dice la gente</h2>
      </div>
      {notes.length === 0 ? (
        <p className="empty-state">Nadie ha escrito todavía sobre esto. Sé la primera persona.</p>
      ) : (
        <ul className="note-list">
          {notes.map((entry) => (
            <NoteCard
              key={entry.note.id}
              note={entry.note}
              author={entry.author}
              interactions={interactions.get(entry.note.id)}
            />
          ))}
        </ul>
      )}
    </>
  );
}
