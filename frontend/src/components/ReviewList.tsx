import type { Review } from "../types";
import Stars from "./Stars";

interface Props {
  reviews: Review[];
  // Solo la página de reseñas pasa estos handlers; en los perfiles es de solo lectura
  onEdit?: (review: Review) => void;
  onDelete?: (review: Review) => void;
}

export default function ReviewList({ reviews, onEdit, onDelete }: Props) {
  if (reviews.length === 0) {
    return <p className="muted">Todavía no hay reseñas.</p>;
  }

  return (
    <ul className="review-list">
      {reviews.map((review) => (
        <li key={review.id} className="review-card">
          {review.imageUrl ? (
            <img className="cover" src={review.imageUrl} alt="" />
          ) : (
            <div className="cover cover-placeholder">♪</div>
          )}
          <div className="review-body">
            <p className="review-title">
              <strong>{review.itemName}</strong>
              <span className="muted"> — {review.artistName}</span>
              <span className="badge">{review.itemType === "album" ? "álbum" : "canción"}</span>
            </p>
            <p className="review-rating">
              <Stars rating={review.rating} /> <span className="muted">{review.rating}</span>
            </p>
            {review.text && <p className="review-text">{review.text}</p>}
            <p className="muted">
              {new Date(review.createdAt).toLocaleDateString()}
              {review.updatedAt && " · editada"}
            </p>
          </div>
          {(onEdit || onDelete) && (
            <div className="review-actions">
              {onEdit && (
                <button className="btn-link" onClick={() => onEdit(review)}>
                  Editar
                </button>
              )}
              {onDelete && (
                <button className="btn-link" onClick={() => onDelete(review)}>
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
