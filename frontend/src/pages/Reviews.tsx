import { useEffect, useState } from "react";
import { api } from "../api";
import type { Review, SearchItem, SearchResponse } from "../types";
import ReviewList from "../components/ReviewList";
import Stars from "../components/Stars";

// Lo que hace falta para abrir el formulario: o un resultado de búsqueda
// (reseña nueva) o una reseña existente (edición)
interface Draft {
  reviewId?: string;
  itemType: "album" | "track";
  spotifyItemId: string;
  name: string;
  artistName: string;
}

export default function Reviews() {
  const [myReviews, setMyReviews] = useState<Review[]>([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [searching, setSearching] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [rating, setRating] = useState(3.5);
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);

  const loadMine = () => {
    api.get<Review[]>("/api/reviews/mine").then(setMyReviews).catch(() => {});
  };

  useEffect(loadMine, []);

  const search = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setError("");
    try {
      setResults(await api.get<SearchResponse>(`/api/search?q=${encodeURIComponent(query)}`));
    } catch {
      setError("No se pudo buscar en Spotify");
    } finally {
      setSearching(false);
    }
  };

  const openNew = (item: SearchItem, itemType: "album" | "track") => {
    setDraft({ itemType, spotifyItemId: item.id, name: item.name, artistName: item.artistName });
    setRating(3.5);
    setText("");
    setError("");
  };

  const openEdit = (review: Review) => {
    setDraft({
      reviewId: review.id,
      itemType: review.itemType,
      spotifyItemId: review.spotifyItemId,
      name: review.itemName,
      artistName: review.artistName,
    });
    setRating(review.rating);
    setText(review.text ?? "");
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    setError("");
    try {
      if (draft.reviewId) {
        await api.put(`/api/reviews/${draft.reviewId}`, { rating, text });
      } else {
        await api.post("/api/reviews", {
          itemType: draft.itemType,
          spotifyItemId: draft.spotifyItemId,
          rating,
          text,
        });
      }
      setDraft(null);
      loadMine();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar la reseña");
    } finally {
      setSaving(false);
    }
  };

  // Borrar pide un segundo clic en vez de un confirm() del navegador
  const remove = async (review: Review) => {
    if (confirmingDelete !== review.id) {
      setConfirmingDelete(review.id);
      return;
    }
    setConfirmingDelete(null);
    await api.delete(`/api/reviews/${review.id}`).catch(() => {});
    loadMine();
  };

  return (
    <>
      <h1>Reseñas</h1>

      {draft && (
        <section className="review-form">
          <h2>
            {draft.reviewId ? "Editar reseña" : "Nueva reseña"}:{" "}
            <span className="accent">{draft.name}</span>
            <span className="muted"> — {draft.artistName}</span>
          </h2>
          <label className="rating-row">
            <input
              type="range"
              min={0.5}
              max={5}
              step={0.5}
              value={rating}
              onChange={(e) => setRating(Number(e.target.value))}
            />
            <Stars rating={rating} />
            <strong>{rating}</strong>
          </label>
          <textarea
            placeholder="¿Qué te ha parecido? (opcional)"
            maxLength={2000}
            rows={4}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <div className="review-form-actions">
            <button className="btn" onClick={save} disabled={saving}>
              {saving ? "Guardando…" : "Guardar"}
            </button>
            <button className="btn-link" onClick={() => setDraft(null)}>
              Cancelar
            </button>
          </div>
          {error && <p className="error">{error}</p>}
        </section>
      )}

      <section>
        <h2>Buscar algo que reseñar</h2>
        <form className="search-form" onSubmit={search}>
          <input
            type="search"
            placeholder="Álbum o canción…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button className="btn" type="submit" disabled={searching}>
            {searching ? "Buscando…" : "Buscar"}
          </button>
        </form>
        {!draft && error && <p className="error">{error}</p>}

        {results && (
          <div className="search-results">
            <div>
              <h3>Álbumes</h3>
              {results.albums.length === 0 && <p className="muted">Sin resultados.</p>}
              <ul className="user-list">
                {results.albums.map((album) => (
                  <li key={album.id} className="user-card">
                    {album.imageUrl ? (
                      <img className="cover" src={album.imageUrl} alt="" />
                    ) : (
                      <div className="cover cover-placeholder">♪</div>
                    )}
                    <span>
                      <strong>{album.name}</strong>
                      <span className="muted"> — {album.artistName}</span>
                    </span>
                    <button className="btn btn-sm" onClick={() => openNew(album, "album")}>
                      Reseñar
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3>Canciones</h3>
              {results.tracks.length === 0 && <p className="muted">Sin resultados.</p>}
              <ul className="user-list">
                {results.tracks.map((track) => (
                  <li key={track.id} className="user-card">
                    {track.imageUrl ? (
                      <img className="cover" src={track.imageUrl} alt="" />
                    ) : (
                      <div className="cover cover-placeholder">♪</div>
                    )}
                    <span>
                      <strong>{track.name}</strong>
                      <span className="muted"> — {track.artistName}</span>
                    </span>
                    <button className="btn btn-sm" onClick={() => openNew(track, "track")}>
                      Reseñar
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </section>

      <section>
        <h2>Mis reseñas</h2>
        <ReviewList
          reviews={myReviews}
          onEdit={openEdit}
          onDelete={remove}
        />
        {confirmingDelete && (
          <p className="muted">Pulsa "Borrar" otra vez para confirmar.</p>
        )}
      </section>
    </>
  );
}
