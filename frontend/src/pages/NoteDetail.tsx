import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, getMyUserId } from "../api";
import type {
  Affinity,
  MusicItemDetail,
  Note,
  NoteAuthor,
  NoteInteractions,
} from "../types";
import NoteCard from "../components/NoteCard";
import NoteInteractionsBar, { loadInteractions } from "../components/NoteInteractionsBar";
import PlatformPlayer from "../components/PlatformPlayer";
import { resolveVibe } from "../vibes";

interface NoteDetailResponse {
  author: NoteAuthor;
  note: Note;
}

const TYPE_LABEL: Record<string, string> = {
  album: "álbum",
  track: "canción",
  artist: "artista",
  localGroup: "grupo local",
};

// "sobre una canción", "sobre un álbum"...
const ABOUT_LABEL: Record<string, string> = {
  album: "sobre un álbum",
  track: "sobre una canción",
  artist: "sobre un artista",
  localGroup: "sobre un grupo local",
};

// El panel lateral nombra el item por lo que es
const PANEL_LABEL: Record<string, string> = {
  album: "El álbum",
  track: "La canción",
  artist: "El artista",
  localGroup: "El grupo",
};

// La página de una nota: el texto en grande sobre un hero teñido por su
// vibe, la música para escucharla al momento, la conversación abierta y
// las otras notas que la comunidad escribió sobre lo mismo.
export default function NoteDetail() {
  const { id } = useParams();
  const [detail, setDetail] = useState<NoteDetailResponse | null>(null);
  const [interactions, setInteractions] = useState<Map<string, NoteInteractions>>(new Map());
  const [others, setOthers] = useState<MusicItemDetail["notes"]>([]);
  const [commonArtists, setCommonArtists] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const myId = getMyUserId();

  useEffect(() => {
    setDetail(null);
    setOthers([]);
    setCommonArtists([]);
    setError("");

    api
      .get<NoteDetailResponse>(`/api/notes/${id}`)
      .then(async (d) => {
        setDetail(d);

        // El resto de datos visten la página; si fallan, la nota se ve igual
        const itemDetail = await api
          .get<MusicItemDetail>(`/api/music-items/${d.note.item.id}`)
          .catch(() => null);
        const otherNotes = itemDetail?.notes.filter((n) => n.note.id !== d.note.id) ?? [];
        setOthers(otherNotes);
        loadInteractions([d.note.id, ...otherNotes.map((n) => n.note.id)])
          .then(setInteractions)
          .catch(() => {});

        if (d.author.id !== myId) {
          api
            .get<Affinity>(`/api/users/${d.author.id}/affinity`)
            .then((a) => setCommonArtists(a.commonArtists))
            .catch(() => {});
        }
        api
          .get<string[]>("/api/discoveries/mine")
          .then((ids) => setSaved(ids.includes(d.note.item.id)))
          .catch(() => {});
      })
      .catch(() => setError("Esta nota no existe o no se pudo cargar"));
  }, [id, myId]);

  if (error) return <p className="error">{error}</p>;
  if (!detail) {
    return (
      <div className="loading-state">
        <span className="spinner" />
        Cargando…
      </div>
    );
  }

  const { author, note } = detail;
  const item = note.item;
  const isMine = author.id === myId;
  const vibe = note.vibeColor ? resolveVibe(note.vibeColor) : null;

  // El "escúchalo aquí" de la nota manda sobre los enlaces del item
  const youtubeUrl = note.listenUrl?.includes("soundcloud.com")
    ? item.youtubeUrl
    : (note.listenUrl ?? item.youtubeUrl);
  const soundcloudUrl = note.listenUrl?.includes("soundcloud.com")
    ? note.listenUrl
    : item.soundcloudUrl;

  const save = async () => {
    setError("");
    try {
      await api.post("/api/discoveries", { noteId: note.id });
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar");
    }
  };

  return (
    <>
      <header
        className="note-hero"
        // El hero se tiñe con el vibe de la nota; sin vibe, salvia tenue
        style={{
          background: `linear-gradient(160deg, ${vibe?.hex ?? "#a8c8a0"}29, ${
            vibe?.hex ?? "#a8c8a0"
          }0d 70%)`,
        }}
      >
        <Link to="/feed" className="back-link">← Volver al feed</Link>
        <div className="note-author">
          {author.avatarUrl ? (
            <img className="note-avatar" src={author.avatarUrl} alt="" />
          ) : (
            <span className="note-avatar avatar-placeholder">
              {author.displayName[0]?.toUpperCase() ?? "♪"}
            </span>
          )}
          <div className="note-hero-who">
            <Link className="note-author-name" to={`/gente/${author.id}`}>
              {author.displayName}
            </Link>
            <span className="note-track-date">
              {new Date(note.createdAt).toLocaleDateString()} · {ABOUT_LABEL[item.type]}
            </span>
          </div>
        </div>
        {note.text && <p className="note-text note-text-xl">{note.text}</p>}
        <div className="note-hero-tags">
          {note.vibeLabel && vibe && (
            <span className="vibe-chip" style={{ background: vibe.hex, color: vibe.ink }}>
              {note.vibeEmoji && <span>{note.vibeEmoji}</span>}
              {note.vibeLabel}
            </span>
          )}
          {note.anchorArtistName && (
            <p className="rec-line rec-generic">Si te gusta {note.anchorArtistName}</p>
          )}
        </div>
      </header>

      <div className="album-cols">
        <div className="side-stack">
          <article className="note-card note-card-xl">
            <div className="note-meta">
              <Link to={`/musica/${item.id}`}>
                {item.imageUrl ? (
                  <img className="note-cover" src={item.imageUrl} alt="" />
                ) : (
                  <span className="note-cover cover-placeholder">{note.vibeEmoji ?? "♪"}</span>
                )}
              </Link>
              <Link to={`/musica/${item.id}`} className="note-track">
                <span className="note-track-title">
                  {item.name}
                  {item.artistName && ` — ${item.artistName}`}
                </span>
                <span className="note-track-sub">
                  <span className="badge">
                    {item.type === "localGroup"
                      ? (item.category ?? TYPE_LABEL.localGroup).toLowerCase()
                      : TYPE_LABEL[item.type]}
                  </span>
                  <span className="note-track-date">ver ficha →</span>
                </span>
              </Link>
              {!isMine && item.type === "track" && item.spotifyId && (
                <div className="note-actions">
                  <button
                    className={`btn btn-ghost btn-sm btn-save${saved ? " is-saved" : ""}`}
                    onClick={save}
                    disabled={saved}
                  >
                    {saved ? "✓ En tu playlist" : "Guardar"}
                  </button>
                </div>
              )}
            </div>

            <PlatformPlayer
              youtubeUrl={youtubeUrl}
              soundcloudUrl={soundcloudUrl}
              spotifyType={item.type}
              spotifyId={item.spotifyId}
              title={item.name}
            />

            {interactions.get(note.id) && (
              <NoteInteractionsBar
                noteId={note.id}
                interactions={interactions.get(note.id)!}
                startOpen
              />
            )}
          </article>

          {others.length > 0 && (
            <>
              <h2 className="section-title">Otras notas sobre {item.name}</h2>
              <ul className="note-list">
                {others.map((entry) => (
                  <NoteCard
                    key={entry.note.id}
                    note={entry.note}
                    author={entry.author}
                    interactions={interactions.get(entry.note.id)}
                  />
                ))}
              </ul>
            </>
          )}
        </div>

        <div className="side-stack">
          <div className="panel">
            <h3 className="section-title panel-title">{PANEL_LABEL[item.type]}</h3>
            <Link to={`/musica/${item.id}`} className="listening-row">
              <span className="listening-cover">
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt="" />
                ) : (
                  <span className="cover-placeholder">{item.type === "localGroup" ? "🎺" : "♪"}</span>
                )}
              </span>
              <span className="listening-info">
                <strong>{item.name}</strong>
                <span>
                  {item.artistName ??
                    (item.category
                      ? `${item.category}${item.province ? ` · ${item.province}` : ""}`
                      : "")}
                </span>
              </span>
            </Link>
            <Link to={`/musica/${item.id}`} className="btn btn-quiet btn-sm panel-cta">
              Ver la ficha
            </Link>
          </div>

          <div className="panel">
            <h3 className="section-title panel-title">Quien la cuenta</h3>
            <Link to={`/gente/${author.id}`} className="listening-row">
              <span className="listening-cover is-avatar">
                {author.avatarUrl ? (
                  <img src={author.avatarUrl} alt="" />
                ) : (
                  <span className="cover-placeholder">
                    {author.displayName[0]?.toUpperCase() ?? "♪"}
                  </span>
                )}
              </span>
              <span className="listening-info">
                <strong>{author.displayName}</strong>
              </span>
            </Link>
            <div className="panel-cta-row">
              <Link to={`/gente/${author.id}`} className="btn btn-quiet btn-sm">
                {isMine ? "Mi perfil" : "Ver su bitácora"}
              </Link>
              {!isMine && (
                <Link to={`/chats/${author.id}`} className="btn btn-quiet btn-sm">
                  Mensaje
                </Link>
              )}
            </div>
          </div>

          {commonArtists.length > 0 && (
            <div className="panel">
              <h3 className="section-title panel-title">En común</h3>
              <p className="section-sub">
                Escucháis{" "}
                {commonArtists.slice(0, 3).map((name, i) => (
                  <span key={name}>
                    {i > 0 && (i === Math.min(commonArtists.length, 3) - 1 ? " y " : ", ")}
                    <strong className="common-artist">{name}</strong>
                  </span>
                ))}
                . Por eso os cruzáis.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
